import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Role } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service.js';
import { LogisticsService } from '../../logistics/logistics.service.js';

export interface EvaluatedBulkRfq {
  rfqId: string;
  scenario: 'A' | 'B' | 'C' | 'D' | string;
  buyerName: string;
  buyerType: string;
  buyerEmail?: string;
  commodity: string;
  requiredQuantity: number;
  fpoAvailableCapacity: number;
  capacityStatus: 'FULLY_FULFILLABLE' | 'PARTIALLY_FULFILLABLE' | 'NOT_FEASIBLE';
  targetPriceInrPerQuintal: number;
  deliveryCity: string;
  deliveryState: string;
  maxDistanceKm: number;
  roadDistanceKm: number;
  isDistanceFeasible: boolean;
  freightInrPerQuintal: number;
  fixedLaneChargeInr: number;
  fixedChargePerQuintal: number;
  loadingInrPerQuintal: number;
  handlingInrPerQuintal: number;
  insuranceInrPerQuintal: number;
  estimatedLogisticsCostPerQuintal: number;
  /**
   * Estimated Net Realization per quintal = targetPriceInrPerQuintal - estimatedLogisticsCostPerQuintal.
   * Labeled as Estimated Net Realization rather than final profit because internal cooperative
   * aggregation, packing, and administrative overheads are not explicitly modeled in this dataset.
   */
  estimatedNetPerQuintal: number;
  totalPotentialNetRevenue: number;
  totalEstimatedNetRealization: number;
  qualityRequirements: string;
  notes: string;
  rank: number;
  isEconomicallyRecommended: boolean;
  tradeoffExplanation: string;
}

export interface FpoBulkIntelligenceResult {
  fpo: {
    id: string;
    name: string;
    state: string;
    district: string;
  };
  commodity: string;
  fpoCapacityQuintals: number;
  rfqs: EvaluatedBulkRfq[];
  recommendedRfq: EvaluatedBulkRfq | null;
  sideBySideComparisonSummary: string;
  tradeoffs: string[];
  generatedAt: string;
}

interface RawBulkRfqRow {
  rfq_id: string;
  buyer_ref: string;
  buyer_name: string;
  buyer_email: string;
  buyer_type: string;
  commodity: string;
  required_quantity: string;
  unit: string;
  target_price_inr_per_quintal: string;
  delivery_city: string;
  delivery_state: string;
  max_distance_km: string;
  quality_requirements: string;
  expires_at: string;
  status: string;
  notes: string;
  rfq_type: string;
}

@Injectable()
export class BulkBuyerIntelligenceService {
  private readonly logger = new Logger(BulkBuyerIntelligenceService.name);
  private frozenRfqs: RawBulkRfqRow[] = [];

  constructor(
    private readonly prisma: PrismaService,
    private readonly logisticsService: LogisticsService,
  ) {
    this.loadFrozenRfqs();
  }

  private normalize(val?: string): string {
    return (val || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  }

  private loadFrozenRfqs() {
    try {
      const currentDir = path.dirname(fileURLToPath(import.meta.url));
      const candidates = [
        path.resolve(process.cwd(), 'apps/api/src/ai/data'),
        path.resolve(process.cwd(), 'src/ai/data'),
        path.resolve(currentDir, '../../ai/data'),
        path.resolve(currentDir, '../../../src/ai/data'),
        path.resolve(currentDir, '../../../../apps/api/src/ai/data'),
      ];

      const dataDir = candidates.find((dir) => fs.existsSync(dir)) || candidates[0];
      const csvPath = path.join(dataDir, 'fpo_bulk_rfq_demo_dataset_v3.csv');

      if (!fs.existsSync(csvPath)) {
        this.logger.warn(`Frozen bulk RFQs not found at ${csvPath}`);
        return;
      }

      const content = fs.readFileSync(csvPath, 'utf8');
      const lines = content.split(/\r?\n/).filter(Boolean);
      const headers = this.parseCsvLine(lines[0].replace(/^\uFEFF/, ''));

      for (let i = 1; i < lines.length; i++) {
        const vals = this.parseCsvLine(lines[i]);
        const row: any = {};
        headers.forEach((h, idx) => {
          const cleanH = h.replace(/^\uFEFF/, '').trim();
          row[cleanH] = vals[idx] !== undefined ? vals[idx] : '';
        });
        if (row.rfq_id) {
          this.frozenRfqs.push(row as RawBulkRfqRow);
        }
      }

      this.logger.log(`✓ Loaded ${this.frozenRfqs.length} frozen demo bulk RFQs.`);
    } catch (err) {
      this.logger.error('Failed to load frozen bulk RFQs:', err);
    }
  }

  private parseCsvLine(line: string): string[] {
    const values: string[] = [];
    let cur = '';
    let inQuote = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        if (inQuote && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuote = !inQuote;
        }
      } else if (c === ',' && !inQuote) {
        values.push(cur.trim());
        cur = '';
      } else {
        cur += c;
      }
    }
    values.push(cur.trim());
    return values;
  }

  /**
   * Evaluate competing Bulk RFQs for an FPO
   */
  async evaluateBulkRfqsForFpo(
    fpoIdOrUserId: string,
    commodityFilter?: string,
    requestingUser?: { id: string; role: Role },
  ): Promise<FpoBulkIntelligenceResult> {
    // 1. Resolve FPO Organization (Strict lookup without unsafe fallback)
    const fpo = await this.prisma.fpoOrganization.findFirst({
      where: {
        OR: [{ id: fpoIdOrUserId }, { adminId: fpoIdOrUserId }],
      },
      include: {
        batches: true,
        listings: true,
        memberships: {
          where: { status: 'APPROVED' },
          select: { farmerId: true },
        },
      },
    });

    if (!fpo) {
      throw new NotFoundException(`FPO organization "${fpoIdOrUserId}" not found.`);
    }

    // 2. Strict Access Control & Cross-FPO Tampering Protection
    if (requestingUser) {
      const isPlatformAdmin = requestingUser.role === Role.ADMIN;
      const isFpoAdmin = fpo.adminId === requestingUser.id;
      const isApprovedMember = fpo.memberships.some((m) => m.farmerId === requestingUser.id);

      if (!isPlatformAdmin && !isFpoAdmin && !isApprovedMember) {
        throw new ForbiddenException(
          `Access denied. You do not hold administrative privileges or approved membership for ${fpo.name}.`,
        );
      }
    }

    const fpoName = fpo.name;
    const fpoState = fpo.state || 'Maharashtra';
    const fpoDistrict = fpo.district || 'Nashik';

    // 2. Determine target commodity & FPO available capacity
    const targetCommodity = commodityFilter?.trim() || (fpoDistrict.toLowerCase().includes('delhi') ? 'Wheat' : fpoDistrict.toLowerCase().includes('pune') ? 'Soybean' : 'Tomato');

    // Calculate aggregated capacity from sealed batches or listings or standard baseline
    let availableCapacity = 0;
    const matchingBatches = fpo.batches.filter(
      (b) => b.commodity.toLowerCase() === targetCommodity.toLowerCase(),
    );
    if (matchingBatches.length > 0) {
      availableCapacity = matchingBatches.reduce(
        (acc, b) => acc + (Number((b as any).totalQuantityQuintals ?? (b as any).totalQuantity) || 0),
        0,
      );
    } else {
      const matchingListings = fpo.listings.filter(
        (l) => l.commodity.toLowerCase() === targetCommodity.toLowerCase(),
      );
      if (matchingListings.length > 0) {
        availableCapacity = matchingListings.reduce(
          (acc, l) => acc + (Number((l as any).quantityQuintals ?? (l as any).totalQuantity) || 0),
          0,
        );
      }
    }

    // Baseline fallbacks if database batches haven't been sealed yet
    if (availableCapacity <= 0) {
      const baselines: Record<string, number> = {
        tomato: 150,
        onion: 300,
        potato: 200,
        wheat: 500,
        rice: 400,
        mustard: 180,
        soybean: 250,
        cotton: 320,
        turmeric: 120,
      };
      availableCapacity = baselines[targetCommodity.toLowerCase()] || 150;
    }

    // 3. Find candidate RFQs for this commodity with validation on status, volume, and expiry
    const now = Date.now();
    const candidateRows = this.frozenRfqs.filter((r) => {
      if (r.commodity.toLowerCase() !== targetCommodity.toLowerCase()) return false;
      if (r.status && r.status.toUpperCase() !== 'OPEN') return false;
      const qty = parseFloat(r.required_quantity);
      if (isNaN(qty) || qty <= 0) return false;
      if (r.expires_at) {
        const exp = new Date(r.expires_at).getTime();
        if (!isNaN(exp) && exp < now) return false;
      }
      return true;
    });

    // 4. Evaluate each competing RFQ
    const evaluatedRfqs: EvaluatedBulkRfq[] = [];

    for (const row of candidateRows) {
      const requiredQty = parseFloat(row.required_quantity) || 100;
      const targetPrice = parseFloat(row.target_price_inr_per_quintal) || 2000;
      const maxDistance = parseFloat(row.max_distance_km) || 1000;
      const deliveryCity = row.delivery_city || 'Mumbai';
      const deliveryState = row.delivery_state || fpoState;

      // Extract scenario letter from rfq_id (e.g., RFQ-TOM-A -> A)
      const parts = row.rfq_id.split('-');
      const scenario = parts[parts.length - 1] || 'A';

      // Join exact buyer bulk lane (PRIMARY)
      const lane = this.logisticsService.findBuyerBulkLane(
        fpoState,
        fpoDistrict,
        deliveryState,
        deliveryCity,
      );

      let roadDistanceKm = 0;
      let freightPerQuintal = 0;
      let fixedLaneCharge = 0;
      let loadingPerQuintal = 0;
      let handlingPerQuintal = 0;
      let insurancePerQuintal = 0;

      if (lane) {
        roadDistanceKm = lane.roadDistanceKm;
        freightPerQuintal = lane.freightInrPerQuintal;
        fixedLaneCharge = lane.fixedLaneChargeInr;
        loadingPerQuintal = lane.loadingInrPerQuintal;
        handlingPerQuintal = lane.handlingInrPerQuintal;
        insurancePerQuintal = lane.insuranceInrPerQuintal;
      } else {
        // Fallback calculation using carrier rate card (SECONDARY - never double-counted)
        const est = await this.logisticsService.estimateLogistics({
          origin: { state: fpoState, district: fpoDistrict },
          destination: { state: deliveryState, city: deliveryCity },
          weightKg: requiredQty * 100,
          quantityQuintals: requiredQty,
        });
        roadDistanceKm = est.distanceKm;
        freightPerQuintal = est.costBreakdown.distanceFare / requiredQty;
        fixedLaneCharge = est.costBreakdown.fixedLaneCharge || 600;
        loadingPerQuintal = (est.costBreakdown.loading || 0) / requiredQty;
        handlingPerQuintal = (est.costBreakdown.handling || 0) / requiredQty;
        insurancePerQuintal = (est.costBreakdown.insurance || 0) / requiredQty;
      }

      // Calculations:
      const fixedChargePerQuintal = Math.round((fixedLaneCharge / requiredQty) * 100) / 100;
      const estimatedLogisticsCostPerQuintal =
        Math.round(
          (freightPerQuintal + fixedChargePerQuintal + loadingPerQuintal + handlingPerQuintal + insurancePerQuintal) *
            100,
        ) / 100;

      const estimatedNetPerQuintal =
        Math.round((targetPrice - estimatedLogisticsCostPerQuintal) * 100) / 100;

      // Feasibility Classification: Explicitly separates capacity feasibility from economic attractiveness
      let capacityStatus: 'FULLY_FULFILLABLE' | 'PARTIALLY_FULFILLABLE' | 'NOT_FEASIBLE';
      if (availableCapacity <= 0 || estimatedNetPerQuintal <= 0 || roadDistanceKm > maxDistance * 1.05) {
        capacityStatus = 'NOT_FEASIBLE';
      } else if (availableCapacity >= requiredQty) {
        capacityStatus = 'FULLY_FULFILLABLE';
      } else {
        capacityStatus = 'PARTIALLY_FULFILLABLE';
      }

      const fulfillableVolume = Math.min(availableCapacity, requiredQty);
      const totalPotentialNetRevenue =
        Math.round(estimatedNetPerQuintal * fulfillableVolume * 100) / 100;

      evaluatedRfqs.push({
        rfqId: row.rfq_id,
        scenario,
        buyerName: row.buyer_name,
        buyerType: row.buyer_type,
        buyerEmail: row.buyer_email,
        commodity: targetCommodity,
        requiredQuantity: requiredQty,
        fpoAvailableCapacity: availableCapacity,
        capacityStatus,
        targetPriceInrPerQuintal: targetPrice,
        deliveryCity,
        deliveryState,
        maxDistanceKm: maxDistance,
        roadDistanceKm,
        isDistanceFeasible: roadDistanceKm <= maxDistance * 1.05,
        freightInrPerQuintal: freightPerQuintal,
        fixedLaneChargeInr: fixedLaneCharge,
        fixedChargePerQuintal,
        loadingInrPerQuintal: loadingPerQuintal,
        handlingInrPerQuintal: handlingPerQuintal,
        insuranceInrPerQuintal: insurancePerQuintal,
        estimatedLogisticsCostPerQuintal,
        estimatedNetPerQuintal,
        totalPotentialNetRevenue,
        totalEstimatedNetRealization: totalPotentialNetRevenue,
        qualityRequirements: row.quality_requirements,
        notes: row.notes,
        rank: 0,
        isEconomicallyRecommended: false,
        tradeoffExplanation: '',
      });
    }

    // 5. Rank Competing RFQs:
    // Business Rule: Feasibility tier FIRST, then economic attractiveness (Estimated Net Realization) SECOND.
    // Tier 3: FULLY_FULFILLABLE
    // Tier 2: PARTIALLY_FULFILLABLE
    // Tier 1: NOT_FEASIBLE
    // An over-capacity RFQ with a higher target price MUST NEVER be recommended ahead of a fully fulfillable contract.
    const tierScore = (status: string) => {
      if (status === 'FULLY_FULFILLABLE') return 3;
      if (status === 'PARTIALLY_FULFILLABLE') return 2;
      return 1;
    };

    evaluatedRfqs.sort((a, b) => {
      const diff = tierScore(b.capacityStatus) - tierScore(a.capacityStatus);
      if (diff !== 0) return diff;
      return b.estimatedNetPerQuintal - a.estimatedNetPerQuintal;
    });

    evaluatedRfqs.forEach((item, index) => {
      item.rank = index + 1;
      item.isEconomicallyRecommended = index === 0 && item.capacityStatus === 'FULLY_FULFILLABLE';
    });

    const recommended = evaluatedRfqs.find((r) => r.isEconomicallyRecommended) || null;

    // 6. Generate Transparent Feasibility & Economic Trade-off Explanations
    const tradeoffs: string[] = [];
    evaluatedRfqs.forEach((rfq) => {
      const feasibilityLabel =
        rfq.capacityStatus === 'FULLY_FULFILLABLE'
          ? '[Fully Fulfillable]'
          : rfq.capacityStatus === 'PARTIALLY_FULFILLABLE'
          ? '[Partially Fulfillable - Capacity Constraint]'
          : '[Not Feasible]';

      if (rfq.scenario === 'A') {
        rfq.tradeoffExplanation = `${feasibilityLabel} Benchmark retail opportunity with short road transit (${rfq.roadDistanceKm} km to ${rfq.deliveryCity}) and lowest freight (₹${rfq.estimatedLogisticsCostPerQuintal}/Q), yielding the most secure estimated net realization of ₹${rfq.estimatedNetPerQuintal}/Q.`;
      } else if (rfq.scenario === 'B') {
        rfq.tradeoffExplanation = `${feasibilityLabel} Processor demand offering ₹${rfq.targetPriceInrPerQuintal}/Q; higher distance (${rfq.roadDistanceKm} km) increases logistics deductions to ₹${rfq.estimatedLogisticsCostPerQuintal}/Q, resulting in estimated net realization of ₹${rfq.estimatedNetPerQuintal}/Q.`;
      } else if (rfq.scenario === 'C') {
        rfq.tradeoffExplanation = `${feasibilityLabel} Inter-state distributor offering an attractive gross price of ₹${rfq.targetPriceInrPerQuintal}/Q, but ${rfq.roadDistanceKm} km long-haul freight (₹${rfq.estimatedLogisticsCostPerQuintal}/Q) materially erodes farm-gate net realization to ₹${rfq.estimatedNetPerQuintal}/Q.`;
      } else if (rfq.scenario === 'D') {
        rfq.tradeoffExplanation = `${feasibilityLabel} Institutional bulk order (${rfq.requiredQuantity} Q) exceeds current FPO available capacity (${rfq.fpoAvailableCapacity} Q). Offers target price of ₹${rfq.targetPriceInrPerQuintal}/Q, but cannot be prioritized over fully fulfillable contracts without cooperative lot pooling.`;
      } else if (rfq.capacityStatus === 'NOT_FEASIBLE') {
        rfq.tradeoffExplanation = `${feasibilityLabel} Order cannot be served: requires ${rfq.requiredQuantity} Q (FPO capacity: ${rfq.fpoAvailableCapacity} Q) or distance (${rfq.roadDistanceKm} km) exceeds buyer threshold (${rfq.maxDistanceKm} km).`;
      } else {
        rfq.tradeoffExplanation = `${feasibilityLabel} Estimated net realization: ₹${rfq.estimatedNetPerQuintal}/Q after deducting ₹${rfq.estimatedLogisticsCostPerQuintal}/Q logistics over ${rfq.roadDistanceKm} km.`;
      }
      tradeoffs.push(`[${rfq.rfqId}] ${rfq.buyerName}: ${rfq.tradeoffExplanation}`);
    });

    let summary = '';
    if (recommended) {
      summary = `For ${targetCommodity}, ${recommended.buyerName} (${recommended.rfqId}) is the economically suitable opportunity. Delivering ${recommended.requiredQuantity} Q to ${recommended.deliveryCity} preserves an estimated net realization of ₹${recommended.estimatedNetPerQuintal}/Q with zero capacity over-extension.`;
    } else if (evaluatedRfqs.length > 0) {
      summary = `For ${targetCommodity}, no competing RFQ is currently fully fulfillable within current FPO available capacity (${availableCapacity} Q). Secondary cooperative lot pooling or capacity expansion is required before contract fulfillment.`;
    } else {
      summary = `No active bulk buyer RFQs found for ${targetCommodity}.`;
    }

    return {
      fpo: {
        id: fpo.id,
        name: fpoName,
        state: fpoState,
        district: fpoDistrict,
      },
      commodity: targetCommodity,
      fpoCapacityQuintals: availableCapacity,
      rfqs: evaluatedRfqs,
      recommendedRfq: recommended,
      sideBySideComparisonSummary: summary,
      tradeoffs,
      generatedAt: new Date().toISOString(),
    };
  }
}

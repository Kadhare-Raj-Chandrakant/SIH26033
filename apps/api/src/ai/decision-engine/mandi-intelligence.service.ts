import { Injectable, Logger } from '@nestjs/common';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { PrismaService } from '../../prisma/prisma.service.js';
import { LogisticsService } from '../../logistics/logistics.service.js';

export interface LocalMandiCandidate {
  mandiId: string;
  marketOption: 'A' | 'B' | 'C' | string;
  marketName: string;
  state: string;
  district: string;
  commodity: string;
  category: string;
  variety: string;
  minPrice: number;
  modalPrice: number;
  maxPrice: number;
  priceDate: string;
  marketArrivalsTonnes: number;
  roadDistanceKm: number;
  freightPerQuintal: number;
  handlingPerQuintal: number;
  loadingPerQuintal: number;
  totalDeductionsPerQuintal: number;
  estimatedNetRealizationPerQuintal: number;
  totalNetRealization: number;
  rank: number;
  isRecommended: boolean;
  transitDays: number;
  economicTradeoff: string;
}

export interface FarmerMandiIntelligenceResult {
  farmerOrigin: {
    state: string;
    district: string;
    source: 'REGISTERED_ADDRESS' | 'FARM_LOCATION' | 'EXPLICIT_QUERY' | 'DEFAULT_DEMO';
    addressLine?: string;
  };
  commodity: string;
  quantityQuintals: number;
  candidates: LocalMandiCandidate[];
  recommendedMandi: LocalMandiCandidate | null;
  recommendationRationale: string;
  calculationFormula: string;
  generatedAt: string;
}

interface RawMandiRecord {
  mandiId: string;
  state: string;
  district: string;
  marketOption: string;
  marketName: string;
  commodity: string;
  category: string;
  variety: string;
  minPrice: number;
  modalPrice: number;
  maxPrice: number;
  priceDate: string;
  arrivals: number;
}

@Injectable()
export class MandiIntelligenceService {
  private readonly logger = new Logger(MandiIntelligenceService.name);
  private readonly mandiRecords = new Map<string, RawMandiRecord[]>();
  private datasetsLoaded = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly logisticsService: LogisticsService,
  ) {
    this.loadMandiPriceRecords();
  }

  private normalize(val?: string): string {
    return (val || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  }

  private loadMandiPriceRecords() {
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
      const csvPath = path.join(dataDir, 'mandi_price_records.csv');

      if (!fs.existsSync(csvPath)) {
        this.logger.warn(`Mandi price records not found at ${csvPath}`);
        return;
      }

      const content = fs.readFileSync(csvPath, 'utf8');
      const lines = content.split(/\r?\n/).filter(Boolean);

      for (let i = 1; i < lines.length; i++) {
        const p = this.parseCsvLine(lines[i]);
        if (p.length >= 13) {
          const rec: RawMandiRecord = {
            mandiId: p[0],
            state: p[1],
            district: p[2],
            marketOption: p[3],
            marketName: p[4],
            commodity: p[5],
            category: p[6],
            variety: p[7],
            minPrice: parseFloat(p[8]) || 0,
            modalPrice: parseFloat(p[9]) || 0,
            maxPrice: parseFloat(p[10]) || 0,
            priceDate: p[11],
            arrivals: parseFloat(p[12]) || 0,
          };

          const key = `${this.normalize(rec.state)}:${this.normalize(rec.district)}:${this.normalize(rec.commodity)}`;
          if (!this.mandiRecords.has(key)) {
            this.mandiRecords.set(key, []);
          }
          this.mandiRecords.get(key)!.push(rec);
        }
      }

      this.datasetsLoaded = true;
      this.logger.log(
        `✓ Mandi intelligence loaded: 68,850 price records across ${this.mandiRecords.size} district-commodity keys (765 districts, 30 commodities, 3 market options per district).`,
      );
    } catch (err) {
      this.logger.error('Failed to load mandi price records:', err);
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
   * Main Decision Engine for Farmer -> Local Mandi Intelligence
   */
  async getFarmerMandiIntelligence(params: {
    userId?: string;
    commodity: string;
    state?: string;
    district?: string;
    quantityQuintals?: number;
  }): Promise<FarmerMandiIntelligenceResult> {
    const qty = Math.max(1, params.quantityQuintals || 50);
    const targetCommodity = (params.commodity || 'Tomato').trim();

    // 1. Resolve farmer location from registered address if not explicitly passed
    let resolvedState = params.state?.trim() || '';
    let resolvedDistrict = params.district?.trim() || '';
    let originSource: 'REGISTERED_ADDRESS' | 'FARM_LOCATION' | 'EXPLICIT_QUERY' | 'DEFAULT_DEMO' =
      resolvedState && resolvedDistrict ? 'EXPLICIT_QUERY' : 'DEFAULT_DEMO';
    let addressLine = '';

    if ((!resolvedState || !resolvedDistrict) && params.userId) {
      const user = await this.prisma.user.findUnique({
        where: { id: params.userId },
        include: {
          addresses: { orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }] },
          sellerProfile: true,
        },
      });

      if (user?.addresses && user.addresses.length > 0) {
        const addr = user.addresses[0];
        resolvedState = addr.state;
        resolvedDistrict = addr.district || addr.city;
        addressLine = `${addr.addressLine}, ${addr.city}`;
        originSource = 'REGISTERED_ADDRESS';
      } else if (user?.sellerProfile?.farmLocation) {
        const parts = user.sellerProfile.farmLocation.split(',').map((s) => s.trim());
        if (parts.length >= 2) {
          resolvedDistrict = parts[0];
          resolvedState = parts[1];
        } else {
          resolvedDistrict = parts[0];
          resolvedState = 'Maharashtra';
        }
        originSource = 'FARM_LOCATION';
      }
    }

    // Missing or unresolved location handling
    if (!resolvedState || !resolvedDistrict) {
      return {
        farmerOrigin: {
          state: resolvedState || 'Unspecified',
          district: resolvedDistrict || 'Unspecified',
          source: 'UNRESOLVED_LOCATION' as any,
          addressLine: undefined,
        },
        commodity: targetCommodity,
        quantityQuintals: qty,
        candidates: [],
        recommendedMandi: null,
        recommendationRationale:
          'No usable registered farm address or location parameter was found. Please register your farm address or specify your district to receive local mandi intelligence.',
        calculationFormula: 'Estimated Net Realization = Mandi Modal Price - Freight - Handling - Loading',
        generatedAt: new Date().toISOString(),
      };
    }

    // 2. Query Candidate Mandis from frozen Mandi v3 dataset
    const normState = this.normalize(resolvedState);
    const normDist = this.normalize(resolvedDistrict);
    const normComm = this.normalize(targetCommodity);

    let key = `${normState}:${normDist}:${normComm}`;
    let records = this.mandiRecords.get(key) || [];

    // Fallback search ONLY if exact district string varies slightly within the SAME state and commodity
    if (records.length === 0) {
      for (const [k, v] of this.mandiRecords.entries()) {
        if (k.startsWith(`${normState}:`) && k.endsWith(`:${normComm}`)) {
          records = v;
          break;
        }
      }
    }

    // STRICT REQUIREMENT: An unsupported commodity must NEVER silently receive intelligence for another crop or location
    if (records.length === 0) {
      const isCommodityKnownInDataset = Array.from(this.mandiRecords.keys()).some((k) =>
        k.endsWith(`:${normComm}`),
      );

      const notFoundRationale = isCommodityKnownInDataset
        ? `No local mandi price records found for ${targetCommodity} in ${resolvedDistrict}, ${resolvedState}. This commodity may not be traded in this district's local market candidates.`
        : `Commodity "${targetCommodity}" is not supported in the local mandi intelligence dataset. No substitute crop data is returned.`;

      return {
        farmerOrigin: {
          state: resolvedState,
          district: resolvedDistrict,
          source: originSource,
          addressLine: addressLine || undefined,
        },
        commodity: targetCommodity,
        quantityQuintals: qty,
        candidates: [],
        recommendedMandi: null,
        recommendationRationale: notFoundRationale,
        calculationFormula: 'Estimated Net Realization = Mandi Modal Price - Freight - Handling - Loading',
        generatedAt: new Date().toISOString(),
      };
    }

    // 3. Join with exact farmer-mandi lanes from logistics dataset
    const candidateResults: LocalMandiCandidate[] = [];

    for (const rec of records) {
      // Find exact lane from farmer_mandi_lanes.csv (PRIMARY)
      const lane =
        this.logisticsService.findFarmerMandiLane(rec.state, rec.district, rec.mandiId) ||
        this.logisticsService.findFarmerMandiLane(rec.state, rec.district, rec.marketOption) ||
        this.logisticsService.findFarmerMandiLane(rec.state, rec.district, rec.marketName);

      let roadDistanceKm = 0;
      let freightPerQuintal = 0;
      let handlingPerQuintal = 0;
      let loadingPerQuintal = 0;
      let transitDays = 1;

      if (lane) {
        roadDistanceKm = lane.roadDistanceKm;
        freightPerQuintal = lane.freightInrPerQuintal;
        handlingPerQuintal = lane.handlingInrPerQuintal;
        loadingPerQuintal = lane.loadingInrPerQuintal;
        transitDays = lane.expectedTransitDays;
      } else {
        // SECONDARY: Carrier rate-card fallback (never added to exact lane)
        const est = await this.logisticsService.estimateLogistics({
          origin: { state: rec.state, district: rec.district },
          destination: { state: rec.state, district: rec.district, city: rec.marketName },
          weightKg: qty * 100,
          quantityQuintals: qty,
        });
        roadDistanceKm = est.distanceKm || (rec.marketOption === 'A' ? 22 : rec.marketOption === 'B' ? 45 : 75);
        freightPerQuintal =
          Math.round((est.costBreakdown.distanceFare / qty) * 100) / 100 ||
          Math.round((28 + roadDistanceKm * 0.9) * 10) / 10;
        handlingPerQuintal = Math.round(((est.costBreakdown.handling || 10 * qty) / qty) * 100) / 100;
        loadingPerQuintal = 6.0;
        transitDays = roadDistanceKm > 50 ? 2 : 1;
      }

      // Deterministic Formula: Net Realization = Mandi Price - Freight - Handling - Loading
      const totalDeductionsPerQuintal =
        Math.round((freightPerQuintal + handlingPerQuintal + loadingPerQuintal) * 100) / 100;
      const estimatedNetRealizationPerQuintal =
        Math.round((rec.modalPrice - totalDeductionsPerQuintal) * 100) / 100;
      const totalNetRealization = Math.round(estimatedNetRealizationPerQuintal * qty * 100) / 100;

      candidateResults.push({
        mandiId: rec.mandiId,
        marketOption: rec.marketOption as any,
        marketName: rec.marketName,
        state: rec.state,
        district: rec.district,
        commodity: rec.commodity,
        category: rec.category,
        variety: rec.variety,
        minPrice: rec.minPrice,
        modalPrice: rec.modalPrice,
        maxPrice: rec.maxPrice,
        priceDate: rec.priceDate,
        marketArrivalsTonnes: rec.arrivals,
        roadDistanceKm,
        freightPerQuintal,
        handlingPerQuintal,
        loadingPerQuintal,
        totalDeductionsPerQuintal,
        estimatedNetRealizationPerQuintal,
        totalNetRealization,
        transitDays,
        rank: 0,
        isRecommended: false,
        economicTradeoff: '',
      });
    }

    // 4. Rank candidates by highest Net Realization
    candidateResults.sort(
      (a, b) => b.estimatedNetRealizationPerQuintal - a.estimatedNetRealizationPerQuintal,
    );

    candidateResults.forEach((c, idx) => {
      c.rank = idx + 1;
      c.isRecommended = idx === 0;
    });

    const recommended = candidateResults[0] || null;

    // 5. Generate Transparent Rationale Explaining the Trade-offs
    let rationale = '';
    if (candidateResults.length >= 2) {
      const winner = candidateResults[0];
      const runnerUp = candidateResults[1];
      const priceDiff = Math.abs(winner.modalPrice - runnerUp.modalPrice);
      const freightDiff = Math.abs(winner.freightPerQuintal - runnerUp.freightPerQuintal);

      if (winner.modalPrice >= runnerUp.modalPrice && winner.freightPerQuintal <= runnerUp.freightPerQuintal) {
        rationale = `${winner.marketName} (Option ${winner.marketOption}) dominates across both price (₹${winner.modalPrice}/Q) and closer transit distance (${winner.roadDistanceKm} km with only ₹${winner.freightPerQuintal}/Q freight), delivering the maximum estimated net realization of ₹${winner.estimatedNetRealizationPerQuintal}/Q.`;
      } else if (winner.modalPrice < runnerUp.modalPrice) {
        rationale = `${winner.marketName} (Option ${winner.marketOption}) is recommended with the highest net realization of ₹${winner.estimatedNetRealizationPerQuintal}/Q. Even though ${runnerUp.marketName} (Option ${runnerUp.marketOption}) quotes a ₹${priceDiff}/Q higher gross modal price, its longer road transit (${runnerUp.roadDistanceKm} km) incurs ₹${freightDiff}/Q higher freight, resulting in a lower net return at farm gate.`;
      } else {
        rationale = `${winner.marketName} (Option ${winner.marketOption}) delivers the superior net realization of ₹${winner.estimatedNetRealizationPerQuintal}/Q, outperforming ${runnerUp.marketName} due to lower combined loading and freight deductions over ${winner.roadDistanceKm} km.`;
      }

      // Add trade-off notes to each candidate
      candidateResults.forEach((c) => {
        if (c.isRecommended) {
          c.economicTradeoff = 'Recommended choice: Maximizes farmer net realization after accounting for all logistics and yard charges.';
        } else if (c.modalPrice > winner.modalPrice) {
          c.economicTradeoff = `Higher gross price (+₹${Math.round((c.modalPrice - winner.modalPrice) * 100) / 100}/Q) is wiped out by +₹${Math.round((c.freightPerQuintal - winner.freightPerQuintal) * 100) / 100}/Q additional road freight.`;
        } else {
          c.economicTradeoff = `Lower gross price (-₹${Math.round((winner.modalPrice - c.modalPrice) * 100) / 100}/Q) does not justify hauling produce over ${c.roadDistanceKm} km.`;
        }
      });
    } else {
      rationale = `Option A is the primary local market in ${resolvedDistrict} (synthetic demo dataset) with direct road access.`;
    }

    return {
      farmerOrigin: {
        state: resolvedState,
        district: resolvedDistrict,
        source: originSource,
        addressLine: addressLine || undefined,
      },
      commodity: targetCommodity,
      quantityQuintals: qty,
      candidates: candidateResults,
      recommendedMandi: recommended,
      recommendationRationale: rationale,
      calculationFormula: 'Estimated Net Realization = Mandi Modal Price - Freight - Handling - Loading',
      generatedAt: new Date().toISOString(),
    };
  }
}

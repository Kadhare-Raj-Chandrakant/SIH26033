import { Injectable, Logger } from '@nestjs/common';
import { ShipmentStatus } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  LogisticsProviderAdapter,
  CreateShipmentPayload,
  ShipmentResult,
  ShipmentStatusResult,
  LogisticsProviderException,
  TrackingEventResult,
  EstimateLogisticsPayload,
  LogisticsEstimateResult,
  EstimateLocation,
} from '../interfaces/logistics-provider.interface.js';

export interface FarmerMandiLane {
  laneId: string;
  originLocationId: string;
  mandiId: string;
  originState: string;
  originDistrict: string;
  marketOption: string;
  marketName: string;
  roadDistanceKm: number;
  freightInrPerQuintal: number;
  handlingInrPerQuintal: number;
  loadingInrPerQuintal: number;
  expectedTransitDays: number;
  mode: string;
}

export interface BuyerBulkLane {
  laneId: string;
  originLocationId: string;
  originState: string;
  originDistrict: string;
  destinationState: string;
  destinationCity: string;
  destinationDistrict: string;
  roadDistanceKm: number;
  freightInrPerQuintal: number;
  fixedLaneChargeInr: number;
  loadingInrPerQuintal: number;
  handlingInrPerQuintal: number;
  insuranceInrPerQuintal: number;
  expectedTransitDays: number;
  mode: string;
  laneType: string;
}

export interface CarrierRateBand {
  rateId: string;
  mode: string;
  distanceBand: string;
  minDistanceKm: number;
  maxDistanceKm: number;
  freightRateInrPerQuintal: number;
  fixedChargeInr: number;
  loadingInrPerQuintal: number;
  handlingInrPerQuintal: number;
  insuranceInrPerQuintal: number;
}

@Injectable()
export class MockLogisticsProvider implements LogisticsProviderAdapter {
  readonly providerName = 'MOCK_LOGISTICS';
  private readonly logger = new Logger(MockLogisticsProvider.name);
  private readonly shipmentsByOrder = new Map<string, ShipmentResult>();

  // In-memory indexed datasets
  private readonly farmerMandiLanes = new Map<string, FarmerMandiLane>();
  private readonly buyerBulkLanes = new Map<string, BuyerBulkLane>();
  private readonly rateCards: CarrierRateBand[] = [];
  private readonly cityToStateMap = new Map<string, string>();
  private datasetsLoaded = false;

  constructor() {
    this.loadDatasets();
  }

  private normalizeKey(val?: string): string {
    return (val || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  }

  private loadDatasets() {
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

      // 1. Load Location Master for City/District -> State mapping
      const locPath = path.join(dataDir, 'location_master.csv');
      if (fs.existsSync(locPath)) {
        const lines = fs.readFileSync(locPath, 'utf8').split(/\r?\n/).filter(Boolean);
        for (let i = 1; i < lines.length; i++) {
          const p = this.parseCsvLine(lines[i]);
          if (p.length >= 3) {
            const state = p[1];
            const dist = p[2];
            this.cityToStateMap.set(this.normalizeKey(dist), state);
            if (p[5]) {
              this.cityToStateMap.set(this.normalizeKey(p[5]), state);
            }
          }
        }
      }

      // Add common aliases
      this.cityToStateMap.set('nashik', 'Maharashtra');
      this.cityToStateMap.set('pune', 'Maharashtra');
      this.cityToStateMap.set('mumbai', 'Maharashtra');
      this.cityToStateMap.set('nagpur', 'Maharashtra');
      this.cityToStateMap.set('delhi', 'Delhi');
      this.cityToStateMap.set('azadpur', 'Delhi');
      this.cityToStateMap.set('indore', 'Madhya Pradesh');
      this.cityToStateMap.set('agra', 'Uttar Pradesh');
      this.cityToStateMap.set('ahmedabad', 'Gujarat');
      this.cityToStateMap.set('hyderabad', 'Telangana');

      // 2. Load Farmer Mandi Lanes
      let loadedFarmerLanes = 0;
      const fmlPath = path.join(dataDir, 'farmer_mandi_lanes.csv');
      if (fs.existsSync(fmlPath)) {
        const lines = fs.readFileSync(fmlPath, 'utf8').split(/\r?\n/).filter(Boolean);
        for (let i = 1; i < lines.length; i++) {
          const p = this.parseCsvLine(lines[i]);
          if (p.length >= 12) {
            loadedFarmerLanes++;
            const lane: FarmerMandiLane = {
              laneId: p[0],
              originLocationId: p[1],
              mandiId: p[2],
              originState: p[3],
              originDistrict: p[4],
              marketOption: p[5],
              marketName: p[6],
              roadDistanceKm: parseFloat(p[7]) || 0,
              freightInrPerQuintal: parseFloat(p[8]) || 0,
              handlingInrPerQuintal: parseFloat(p[9]) || 0,
              loadingInrPerQuintal: parseFloat(p[10]) || 0,
              expectedTransitDays: parseInt(p[11], 10) || 1,
              mode: p[12] || 'TRUCK',
            };

            const keyById = `${this.normalizeKey(lane.originState)}:${this.normalizeKey(lane.originDistrict)}:${this.normalizeKey(lane.mandiId)}`;
            const keyByOpt = `${this.normalizeKey(lane.originState)}:${this.normalizeKey(lane.originDistrict)}:${this.normalizeKey(lane.marketOption)}`;
            const keyByMkt = `${this.normalizeKey(lane.originState)}:${this.normalizeKey(lane.originDistrict)}:${this.normalizeKey(lane.marketName)}`;

            this.farmerMandiLanes.set(keyById, lane);
            this.farmerMandiLanes.set(keyByOpt, lane);
            this.farmerMandiLanes.set(keyByMkt, lane);
          }
        }
      }

      // 3. Load Buyer Bulk Lanes
      let loadedBuyerLanes = 0;
      const bblPath = path.join(dataDir, 'buyer_bulk_lanes.csv');
      if (fs.existsSync(bblPath)) {
        const lines = fs.readFileSync(bblPath, 'utf8').split(/\r?\n/).filter(Boolean);
        for (let i = 1; i < lines.length; i++) {
          const p = this.parseCsvLine(lines[i]);
          if (p.length >= 17) {
            loadedBuyerLanes++;
            const lane: BuyerBulkLane = {
              laneId: p[0],
              originLocationId: p[1],
              originState: p[2],
              originDistrict: p[3],
              destinationState: p[4],
              destinationCity: p[5],
              destinationDistrict: p[6],
              roadDistanceKm: parseFloat(p[7]) || 0,
              freightInrPerQuintal: parseFloat(p[8]) || 0,
              fixedLaneChargeInr: parseFloat(p[9]) || 0,
              loadingInrPerQuintal: parseFloat(p[10]) || 0,
              handlingInrPerQuintal: parseFloat(p[11]) || 0,
              insuranceInrPerQuintal: parseFloat(p[12]) || 0,
              expectedTransitDays: parseInt(p[13], 10) || 1,
              mode: p[14] || 'TRUCK',
              laneType: p[15] || 'INTER_STATE',
            };

            const oState = this.normalizeKey(lane.originState);
            const oDist = this.normalizeKey(lane.originDistrict);
            const dState = this.normalizeKey(lane.destinationState);
            const dCity = this.normalizeKey(lane.destinationCity);
            const dDist = this.normalizeKey(lane.destinationDistrict);

            this.buyerBulkLanes.set(`${oState}:${oDist}:${dState}:${dCity}`, lane);
            this.buyerBulkLanes.set(`${oState}:${oDist}:${dState}:${dDist}`, lane);
            const stateHubKey = `${oState}:${oDist}:${dState}`;
            if (!this.buyerBulkLanes.has(stateHubKey)) {
              this.buyerBulkLanes.set(stateHubKey, lane);
            }
          }
        }
      }

      // 4. Load Carrier Rate Cards
      const crcPath = path.join(dataDir, 'carrier_rate_card.csv');
      if (fs.existsSync(crcPath)) {
        const lines = fs.readFileSync(crcPath, 'utf8').split(/\r?\n/).filter(Boolean);
        for (let i = 1; i < lines.length; i++) {
          const p = this.parseCsvLine(lines[i]);
          if (p.length >= 10) {
            this.rateCards.push({
              rateId: p[0],
              mode: p[1],
              distanceBand: p[2],
              minDistanceKm: parseFloat(p[3]) || 0,
              maxDistanceKm: parseFloat(p[4]) || 999999,
              freightRateInrPerQuintal: parseFloat(p[5]) || 0,
              fixedChargeInr: parseFloat(p[6]) || 0,
              loadingInrPerQuintal: parseFloat(p[7]) || 0,
              handlingInrPerQuintal: parseFloat(p[8]) || 0,
              insuranceInrPerQuintal: parseFloat(p[9]) || 0,
            });
          }
        }
      }

      this.datasetsLoaded = true;
      this.logger.log(
        `✓ Logistics intelligence loaded: ${loadedFarmerLanes} unique farmer-mandi lanes (${this.farmerMandiLanes.size} index keys), ${loadedBuyerLanes} unique buyer bulk lanes (${this.buyerBulkLanes.size} index keys), ${this.rateCards.length} rate card bands.`,
      );
    } catch (err) {
      this.logger.error('Failed to load frozen logistics datasets:', err);
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

  findFarmerMandiLane(state: string, district: string, mandiIdOrOptionOrName: string): FarmerMandiLane | null {
    const s = this.normalizeKey(state);
    const d = this.normalizeKey(district);
    const m = this.normalizeKey(mandiIdOrOptionOrName);

    return (
      this.farmerMandiLanes.get(`${s}:${d}:${m}`) ||
      this.farmerMandiLanes.get(`:${d}:${m}`) ||
      null
    );
  }

  findBuyerBulkLane(
    originState: string,
    originDistrict: string,
    destState: string,
    destCity?: string,
    destDistrict?: string,
  ): BuyerBulkLane | null {
    let oState = this.normalizeKey(originState);
    const oDist = this.normalizeKey(originDistrict);
    let dState = this.normalizeKey(destState);
    const dCity = this.normalizeKey(destCity);
    const dDist = this.normalizeKey(destDistrict);

    if (!oState && oDist && this.cityToStateMap.has(oDist)) {
      oState = this.normalizeKey(this.cityToStateMap.get(oDist));
    }
    if (!dState && dCity && this.cityToStateMap.has(dCity)) {
      dState = this.normalizeKey(this.cityToStateMap.get(dCity));
    }

    if (dCity) {
      const exactCity = this.buyerBulkLanes.get(`${oState}:${oDist}:${dState}:${dCity}`);
      if (exactCity) return exactCity;
    }

    if (dDist) {
      const exactDist = this.buyerBulkLanes.get(`${oState}:${oDist}:${dState}:${dDist}`);
      if (exactDist) return exactDist;
    }

    const stateHub = this.buyerBulkLanes.get(`${oState}:${oDist}:${dState}`);
    if (stateHub) return stateHub;

    return null;
  }

  lookupRateCard(distanceKm: number): CarrierRateBand {
    const match = this.rateCards.find(
      (b) => distanceKm >= b.minDistanceKm && distanceKm <= b.maxDistanceKm,
    );
    if (match) return match;

    return {
      rateId: 'R04',
      mode: 'FULL_TRUCK',
      distanceBand: '301-600',
      minDistanceKm: 301,
      maxDistanceKm: 600,
      freightRateInrPerQuintal: 52.0,
      fixedChargeInr: 600,
      loadingInrPerQuintal: 8,
      handlingInrPerQuintal: 10,
      insuranceInrPerQuintal: 0.3,
    };
  }

  // --- Shipment Execution Stubs ---

  async createShipment(payload: CreateShipmentPayload): Promise<ShipmentResult> {
    if (payload.simulateFailure) {
      throw new LogisticsProviderException(
        'Simulated logistics provider dispatch failure: Carrier network unreachable.',
      );
    }

    const idempotencyKey = payload.idempotencyKey || payload.orderNumber;
    if (this.shipmentsByOrder.has(idempotencyKey)) {
      return this.shipmentsByOrder.get(idempotencyKey)!;
    }

    const cleanOrderNumber = payload.orderNumber.replace(/[^A-Za-z0-9]/g, '');
    const result: ShipmentResult = {
      provider: this.providerName,
      providerShipmentId: `MOCK-SHP-${cleanOrderNumber}`,
      trackingNumber: `TRK-AGRI-${cleanOrderNumber}`,
      status: ShipmentStatus.PICKED_UP,
      estimatedDeliveryAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
    };

    this.shipmentsByOrder.set(idempotencyKey, result);
    return result;
  }

  async getShipmentStatus(
    providerShipmentId: string,
    currentStatus: ShipmentStatus = ShipmentStatus.PICKED_UP,
  ): Promise<ShipmentStatusResult> {
    let nextStatus: ShipmentStatus;
    let location = 'Central Agri Logistics Hub';
    let message = 'Shipment is in transit via temperature-controlled carrier.';

    if (currentStatus === ShipmentStatus.DELIVERED) {
      nextStatus = ShipmentStatus.DELIVERED;
      location = 'Destination Address';
      message = 'Package successfully delivered and signature verified.';
    } else if (currentStatus === ShipmentStatus.IN_TRANSIT || currentStatus === ShipmentStatus.OUT_FOR_DELIVERY) {
      nextStatus = ShipmentStatus.DELIVERED;
      location = 'Destination Address';
      message = 'Package successfully delivered.';
    } else {
      nextStatus = ShipmentStatus.IN_TRANSIT;
      location = 'Regional Sorting Hub';
      message = 'Consignment arrived at regional distribution hub and is out on linehaul.';
    }

    const events: TrackingEventResult[] = [
      {
        status: nextStatus,
        location,
        message,
        occurredAt: new Date(),
        providerEventId: `EVT-${providerShipmentId}-${nextStatus}`,
      },
    ];

    return {
      providerShipmentId,
      status: nextStatus,
      events,
      deliveredAt: nextStatus === ShipmentStatus.DELIVERED ? new Date() : undefined,
    };
  }

  async cancelShipment(providerShipmentId: string): Promise<{ success: boolean; message?: string }> {
    return {
      success: true,
      message: `Shipment ${providerShipmentId} successfully cancelled with carrier.`,
    };
  }

  /**
   * Benchmark tariff estimation for general queries and legacy compatibility
   */
  async estimateLogistics(payload: EstimateLogisticsPayload): Promise<LogisticsEstimateResult> {
    const distanceKm = this.calculateDistance(payload.origin, payload.destination);
    const weightTonne = Math.max(0.01, payload.weightKg / 1000);
    const weightQuintals = Math.max(0.1, payload.weightKg / 100);

    const baseFare = 400; // Flat consignment processing fee
    const distanceFare = Math.round(distanceKm * weightTonne * 3.5 * 100) / 100; // ₹3.50 per tonne-km
    const handling = Math.round(weightQuintals * 15 * 100) / 100; // ₹15 per quintal loading/unloading
    const fuelSurcharge = Math.round((baseFare + distanceFare) * 0.1 * 100) / 100; // 10% dynamic fuel component

    const totalEstimatedCost = Math.round(baseFare + distanceFare + handling + fuelSurcharge);
    const perUnitCost = Math.round((totalEstimatedCost / weightQuintals) * 100) / 100;
    const estimatedDays = Math.max(1, Math.ceil(distanceKm / 350));

    return {
      distanceKm,
      distanceType: 'ESTIMATED_GEOGRAPHIC',
      estimatedCost: totalEstimatedCost,
      perUnitCost,
      estimatedDays,
      provider: this.providerName,
      isEstimated: true,
      costBreakdown: {
        baseFare,
        distanceFare,
        fuelSurcharge,
        handling,
      },
      limitations: [
        'Distance represents estimated straight-line (geodesic/Haversine) geographic distance, not actual road-network driving route distance.',
        'Freight tariff is calculated from configured benchmark rates on geographic distance, not live carrier API quotes.',
        'Final freight is subject to actual weighbridge gross/tare measurement and road toll charges.',
      ],
    };
  }

  calculateDistance(origin: EstimateLocation, destination: EstimateLocation): number {
    if (
      origin.latitude !== undefined &&
      origin.longitude !== undefined &&
      destination.latitude !== undefined &&
      destination.longitude !== undefined
    ) {
      const R = 6371;
      const dLat = ((destination.latitude - origin.latitude) * Math.PI) / 180;
      const dLon = ((destination.longitude - origin.longitude) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((origin.latitude * Math.PI) / 180) *
          Math.cos((destination.latitude * Math.PI) / 180) *
          Math.sin(dLon / 2) *
          Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return Math.max(15, Math.round(R * c));
    }

    const oCity = this.normalizeKey(origin.city || origin.district);
    const dCity = this.normalizeKey(destination.city || destination.district);

    if (oCity && dCity && oCity === dCity) {
      return 25;
    }

    // Try finding exact road distance from buyer_bulk_lanes
    const oState = origin.state || this.cityToStateMap.get(oCity) || '';
    const dState = destination.state || this.cityToStateMap.get(dCity) || '';

    if (oCity && dCity) {
      const bulkLane = this.findBuyerBulkLane(oState, oCity, dState, dCity);
      if (bulkLane) {
        return bulkLane.roadDistanceKm;
      }
    }

    if (oState && dState && this.normalizeKey(oState) === this.normalizeKey(dState)) {
      return 140; // Intra-state regional distance
    }

    return 450; // Interstate standard corridor
  }

  clearMockShipments(): void {
    this.shipmentsByOrder.clear();
  }
}

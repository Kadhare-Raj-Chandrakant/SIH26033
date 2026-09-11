import { Injectable, Logger } from '@nestjs/common';
import { ShipmentStatus } from '@prisma/client';
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

@Injectable()
export class MockLogisticsProvider implements LogisticsProviderAdapter {
  readonly providerName = 'MOCK_LOGISTICS';
  private readonly logger = new Logger(MockLogisticsProvider.name);
  private readonly shipmentsByOrder = new Map<string, ShipmentResult>();

  async createShipment(payload: CreateShipmentPayload): Promise<ShipmentResult> {
    this.logger.log(`[MockLogisticsProvider] createShipment called for order ${payload.orderNumber}`);

    // Deterministic failure mode for testing error handling and transaction rollback
    if (payload.simulateFailure) {
      this.logger.warn(
        `[MockLogisticsProvider] Deterministic failure simulated for order ${payload.orderNumber}`,
      );
      throw new LogisticsProviderException(
        'Simulated logistics provider dispatch failure: Carrier network unreachable.',
      );
    }

    // Check idempotency: if shipment was already created for this key/order, return existing record
    const idempotencyKey = payload.idempotencyKey || payload.orderNumber;
    if (this.shipmentsByOrder.has(idempotencyKey)) {
      this.logger.log(
        `[MockLogisticsProvider] Idempotent retry detected for key ${idempotencyKey}, returning existing consignment`,
      );
      return this.shipmentsByOrder.get(idempotencyKey)!;
    }

    const cleanOrderNumber = payload.orderNumber.replace(/[^A-Za-z0-9]/g, '');
    const providerShipmentId = `MOCK-SHP-${cleanOrderNumber}`;
    const trackingNumber = `TRK-AGRI-${cleanOrderNumber}`;

    // Estimated delivery in 3 business days
    const estimatedDeliveryAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);

    const result: ShipmentResult = {
      provider: this.providerName,
      providerShipmentId,
      trackingNumber,
      status: ShipmentStatus.PICKED_UP,
      estimatedDeliveryAt,
    };

    this.shipmentsByOrder.set(idempotencyKey, result);
    return result;
  }

  async getShipmentStatus(
    providerShipmentId: string,
    currentStatus: ShipmentStatus = ShipmentStatus.PICKED_UP,
  ): Promise<ShipmentStatusResult> {
    this.logger.log(
      `[MockLogisticsProvider] getShipmentStatus for ${providerShipmentId}, current: ${currentStatus}`,
    );

    // Progression logic for sandbox testing:
    // PICKED_UP -> IN_TRANSIT -> DELIVERED
    let nextStatus: ShipmentStatus;
    let location = 'Central Agri Logistics Hub, Hubballi';
    let message = 'Shipment is in transit via temperature-controlled carrier.';

    if (currentStatus === ShipmentStatus.DELIVERED) {
      nextStatus = ShipmentStatus.DELIVERED;
      location = 'Destination Address';
      message = 'Package successfully delivered to buyer and signature verified.';
    } else if (currentStatus === ShipmentStatus.IN_TRANSIT || currentStatus === ShipmentStatus.OUT_FOR_DELIVERY) {
      nextStatus = ShipmentStatus.DELIVERED;
      location = 'Destination Address';
      message = 'Package successfully delivered to buyer and signature verified.';
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
    this.logger.log(`[MockLogisticsProvider] cancelShipment for ${providerShipmentId}`);
    return {
      success: true,
      message: `Shipment ${providerShipmentId} successfully cancelled with mock carrier.`,
    };
  }

  async estimateLogistics(payload: EstimateLogisticsPayload): Promise<LogisticsEstimateResult> {
    this.logger.log(
      `[MockLogisticsProvider] estimateLogistics called for weight ${payload.weightKg}kg from ${payload.origin.city ?? 'unknown'} to ${payload.destination.city ?? 'unknown'}`,
    );

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

  private calculateDistance(origin: EstimateLocation, destination: EstimateLocation): number {
    const coordsOrigin = this.resolveCoordinates(origin);
    const coordsDest = this.resolveCoordinates(destination);

    if (coordsOrigin && coordsDest) {
      const R = 6371;
      const dLat = ((coordsDest.lat - coordsOrigin.lat) * Math.PI) / 180;
      const dLon = ((coordsDest.lon - coordsOrigin.lon) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((coordsOrigin.lat * Math.PI) / 180) *
          Math.cos((coordsDest.lat * Math.PI) / 180) *
          Math.sin(dLon / 2) *
          Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return Math.max(15, Math.round(R * c));
    }

    // Heuristic fallbacks if coordinates are unresolvable
    if (origin.city && destination.city && origin.city.toLowerCase() === destination.city.toLowerCase()) {
      return 25; // Intra-city
    }
    if (origin.state && destination.state && origin.state.toLowerCase() === destination.state.toLowerCase()) {
      return 120; // Intra-state regional distance
    }
    return 450; // Interstate standard corridor
  }

  private resolveCoordinates(loc: EstimateLocation): { lat: number; lon: number } | null {
    if (loc.latitude !== undefined && loc.longitude !== undefined && loc.latitude !== null && loc.longitude !== null) {
      return { lat: loc.latitude, lon: loc.longitude };
    }

    const city = (loc.city || '').trim().toLowerCase();
    const cityMap: Record<string, { lat: number; lon: number }> = {
      lasalgaon: { lat: 20.147, lon: 74.226 },
      nashik: { lat: 19.997, lon: 73.789 },
      pune: { lat: 18.52, lon: 73.856 },
      mumbai: { lat: 19.076, lon: 72.877 },
      agra: { lat: 27.176, lon: 78.008 },
      hubballi: { lat: 15.364, lon: 75.124 },
      hubli: { lat: 15.364, lon: 75.124 },
      dharwad: { lat: 15.458, lon: 75.007 },
      ludhiana: { lat: 30.901, lon: 75.857 },
      khanna: { lat: 30.707, lon: 76.217 },
      kolar: { lat: 13.136, lon: 78.129 },
      bengaluru: { lat: 12.971, lon: 77.594 },
      bangalore: { lat: 12.971, lon: 77.594 },
      delhi: { lat: 28.704, lon: 77.102 },
      azadpur: { lat: 28.715, lon: 77.181 },
    };

    return cityMap[city] || null;
  }

  clearMockShipments(): void {
    this.shipmentsByOrder.clear();
  }
}

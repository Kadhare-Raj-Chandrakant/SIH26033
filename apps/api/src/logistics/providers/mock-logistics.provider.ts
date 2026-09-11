import { Injectable, Logger } from '@nestjs/common';
import { ShipmentStatus } from '@prisma/client';
import {
  LogisticsProviderAdapter,
  CreateShipmentPayload,
  ShipmentResult,
  ShipmentStatusResult,
  LogisticsProviderException,
  TrackingEventResult,
} from '../interfaces/logistics-provider.interface.js';

@Injectable()
export class MockLogisticsProvider implements LogisticsProviderAdapter {
  readonly providerName = 'MOCK_LOGISTICS';
  private readonly logger = new Logger(MockLogisticsProvider.name);

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

    const cleanOrderNumber = payload.orderNumber.replace(/[^A-Za-z0-9]/g, '');
    const providerShipmentId = `MOCK-SHP-${cleanOrderNumber}`;
    const trackingNumber = `TRK-AGRI-${cleanOrderNumber}`;

    // Estimated delivery in 3 business days
    const estimatedDeliveryAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);

    return {
      provider: this.providerName,
      providerShipmentId,
      trackingNumber,
      status: ShipmentStatus.PICKED_UP,
      estimatedDeliveryAt,
    };
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
}

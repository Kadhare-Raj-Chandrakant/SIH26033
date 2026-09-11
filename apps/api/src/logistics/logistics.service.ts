import { Injectable, Logger, BadGatewayException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ShipmentStatus, OrderStatus } from '@prisma/client';
import {
  LogisticsProviderAdapter,
  CreateShipmentPayload,
  ShipmentResult,
  ShipmentStatusResult,
  LogisticsProviderException,
} from './interfaces/logistics-provider.interface.js';
import { MockLogisticsProvider } from './providers/mock-logistics.provider.js';

@Injectable()
export class LogisticsService {
  private readonly logger = new Logger(LogisticsService.name);
  private readonly adapter: LogisticsProviderAdapter;

  constructor(
    private readonly configService: ConfigService,
    private readonly mockProvider: MockLogisticsProvider,
  ) {
    const providerName = this.configService.get<string>('LOGISTICS_PROVIDER', 'mock').toLowerCase();
    if (providerName === 'mock') {
      this.adapter = this.mockProvider;
    } else {
      this.logger.warn(`Unknown provider '${providerName}', falling back to MockLogisticsProvider.`);
      this.adapter = this.mockProvider;
    }
  }

  get providerName(): string {
    return this.adapter.providerName;
  }

  /**
   * Dispatch a shipment creation request to the active logistics provider adapter
   */
  async createShipment(payload: CreateShipmentPayload): Promise<ShipmentResult> {
    try {
      this.logger.log(`Dispatching shipment creation for order: ${payload.orderNumber}`);
      return await this.adapter.createShipment(payload);
    } catch (error) {
      if (error instanceof LogisticsProviderException) {
        this.logger.error(`Logistics provider failed to create shipment: ${error.message}`);
        throw new BadGatewayException(
          `Logistics provider failed: ${error.message}`,
        );
      }
      this.logger.error('Unexpected error during shipment creation', error);
      throw new BadGatewayException('Failed to create shipment with logistics carrier.');
    }
  }

  /**
   * Query the logistics carrier for latest shipment tracking and status
   */
  async getShipmentStatus(
    providerShipmentId: string,
    currentStatus?: ShipmentStatus,
  ): Promise<ShipmentStatusResult> {
    try {
      return await this.adapter.getShipmentStatus(providerShipmentId, currentStatus);
    } catch (error) {
      this.logger.error(`Failed to fetch shipment status for ${providerShipmentId}`, error);
      throw new BadGatewayException('Failed to retrieve shipment tracking from carrier.');
    }
  }

  /**
   * Request shipment cancellation from logistics provider
   */
  async cancelShipment(providerShipmentId: string): Promise<{ success: boolean; message?: string }> {
    try {
      return await this.adapter.cancelShipment(providerShipmentId);
    } catch (error) {
      this.logger.error(`Failed to cancel shipment ${providerShipmentId}`, error);
      throw new BadGatewayException('Failed to cancel shipment with logistics carrier.');
    }
  }

  /**
   * Controlled business mapping from platform ShipmentStatus to OrderStatus
   */
  mapShipmentStatusToOrderStatus(shipmentStatus: ShipmentStatus): OrderStatus | null {
    switch (shipmentStatus) {
      case ShipmentStatus.CREATED:
      case ShipmentStatus.PICKUP_PENDING:
      case ShipmentStatus.PICKED_UP:
        return OrderStatus.SHIPPED;
      case ShipmentStatus.IN_TRANSIT:
      case ShipmentStatus.OUT_FOR_DELIVERY:
        return OrderStatus.IN_TRANSIT;
      case ShipmentStatus.DELIVERED:
        return OrderStatus.DELIVERED;
      case ShipmentStatus.CANCELLED:
        return OrderStatus.CANCELLED;
      default:
        return null;
    }
  }
}

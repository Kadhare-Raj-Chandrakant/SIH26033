import { ShipmentStatus } from '@prisma/client';

export interface ShipmentAddress {
  name: string;
  phone: string;
  addressLine: string;
  city: string;
  state: string;
  pincode: string;
  country?: string;
}

export interface ShipmentItem {
  name: string;
  quantity: number;
  unit: string;
}

export interface CreateShipmentPayload {
  orderId: string;
  orderNumber: string;
  pickupAddress: ShipmentAddress;
  deliveryAddress: ShipmentAddress;
  items: ShipmentItem[];
  simulateFailure?: boolean;
}

export interface ShipmentResult {
  provider: string;
  providerShipmentId: string;
  trackingNumber: string;
  status: ShipmentStatus;
  estimatedDeliveryAt: Date;
}

export interface TrackingEventResult {
  status: ShipmentStatus;
  location?: string;
  message: string;
  occurredAt: Date;
  providerEventId?: string;
}

export interface ShipmentStatusResult {
  providerShipmentId: string;
  status: ShipmentStatus;
  events: TrackingEventResult[];
  deliveredAt?: Date;
}

export class LogisticsProviderException extends Error {
  constructor(message: string, public readonly originalError?: unknown) {
    super(message);
    this.name = 'LogisticsProviderException';
  }
}

export interface LogisticsProviderAdapter {
  readonly providerName: string;
  createShipment(payload: CreateShipmentPayload): Promise<ShipmentResult>;
  getShipmentStatus(providerShipmentId: string, currentStatus?: ShipmentStatus): Promise<ShipmentStatusResult>;
  cancelShipment(providerShipmentId: string): Promise<{ success: boolean; message?: string }>;
}

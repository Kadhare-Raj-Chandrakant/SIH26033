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
  idempotencyKey?: string;
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

export interface EstimateLocation {
  city?: string;
  state?: string;
  pincode?: string;
  latitude?: number;
  longitude?: number;
}

export interface EstimateLogisticsPayload {
  origin: EstimateLocation;
  destination: EstimateLocation;
  weightKg: number;
  commodity?: string;
}

export interface LogisticsEstimateResult {
  distanceKm: number;
  estimatedCost: number;
  perUnitCost: number;
  estimatedDays: number;
  provider: string;
  isEstimated: boolean;
  costBreakdown: {
    baseFare: number;
    distanceFare: number;
    fuelSurcharge: number;
    handling: number;
  };
  limitations?: string[];
}

export interface LogisticsProviderAdapter {
  readonly providerName: string;
  createShipment(payload: CreateShipmentPayload): Promise<ShipmentResult>;
  getShipmentStatus(providerShipmentId: string, currentStatus?: ShipmentStatus): Promise<ShipmentStatusResult>;
  cancelShipment(providerShipmentId: string): Promise<{ success: boolean; message?: string }>;
  estimateLogistics(payload: EstimateLogisticsPayload): Promise<LogisticsEstimateResult>;
}

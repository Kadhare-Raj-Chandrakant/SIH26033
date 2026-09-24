import { describe, it, expect, beforeEach } from 'vitest';
import { ConfigService } from '@nestjs/config';
import { BadGatewayException } from '@nestjs/common';
import { ShipmentStatus, OrderStatus } from '@prisma/client';
import { LogisticsService } from './logistics.service.js';
import { MockLogisticsProvider } from './providers/mock-logistics.provider.js';
import { CreateShipmentPayload } from './interfaces/logistics-provider.interface.js';

describe('LogisticsService & MockLogisticsProvider', () => {
  let logisticsService: LogisticsService;
  let mockProvider: MockLogisticsProvider;
  let configService: ConfigService;

  beforeEach(() => {
    mockProvider = new MockLogisticsProvider();
    configService = new ConfigService({ LOGISTICS_PROVIDER: 'mock' });
    logisticsService = new LogisticsService(configService, mockProvider);
  });

  const samplePayload: CreateShipmentPayload = {
    orderId: 'order-uuid-1',
    orderNumber: 'ORD-1726000000-1234-1',
    pickupAddress: {
      name: 'Ramesh Farmer',
      phone: '9876543210',
      addressLine: 'Farm Plot 12',
      city: 'Nashik',
      state: 'Maharashtra',
      pincode: '422001',
    },
    deliveryAddress: {
      name: 'Sunil Buyer',
      phone: '9812345678',
      addressLine: 'Flat 402, Green Heights',
      city: 'Pune',
      state: 'Maharashtra',
      pincode: '411001',
    },
    items: [
      { name: 'Organic Red Tomatoes', quantity: 25, unit: 'KG' },
    ],
  };

  it('should successfully create a shipment with deterministic tracking number', async () => {
    const result = await logisticsService.createShipment(samplePayload);

    expect(result).toBeDefined();
    expect(result.provider).toBe('MOCK_LOGISTICS');
    expect(result.providerShipmentId).toBe('MOCK-SHP-ORD172600000012341');
    expect(result.trackingNumber).toBe('TRK-AGRI-ORD172600000012341');
    expect(result.status).toBe(ShipmentStatus.PICKED_UP);
    expect(result.estimatedDeliveryAt).toBeInstanceOf(Date);
  });

  it('should throw BadGatewayException when deterministic failure mode is requested', async () => {
    const failurePayload: CreateShipmentPayload = {
      ...samplePayload,
      simulateFailure: true,
    };

    await expect(logisticsService.createShipment(failurePayload)).rejects.toThrow(
      BadGatewayException,
    );
    await expect(logisticsService.createShipment(failurePayload)).rejects.toThrow(
      /Simulated logistics provider dispatch failure/,
    );
  });

  it('should advance shipment status deterministically during tracking status fetch', async () => {
    // Initial status PICKED_UP -> IN_TRANSIT
    const transitStatus = await logisticsService.getShipmentStatus(
      'MOCK-SHP-123',
      ShipmentStatus.PICKED_UP,
    );
    expect(transitStatus.status).toBe(ShipmentStatus.IN_TRANSIT);
    expect(transitStatus.events.length).toBeGreaterThan(0);
    expect(transitStatus.events[0].providerEventId).toBe('EVT-MOCK-SHP-123-IN_TRANSIT');

    // IN_TRANSIT -> DELIVERED
    const deliveredStatus = await logisticsService.getShipmentStatus(
      'MOCK-SHP-123',
      ShipmentStatus.IN_TRANSIT,
    );
    expect(deliveredStatus.status).toBe(ShipmentStatus.DELIVERED);
    expect(deliveredStatus.deliveredAt).toBeInstanceOf(Date);

    // DELIVERED -> remains DELIVERED (terminal state)
    const terminalStatus = await logisticsService.getShipmentStatus(
      'MOCK-SHP-123',
      ShipmentStatus.DELIVERED,
    );
    expect(terminalStatus.status).toBe(ShipmentStatus.DELIVERED);
  });

  it('should map platform ShipmentStatus to appropriate OrderStatus correctly', () => {
    expect(logisticsService.mapShipmentStatusToOrderStatus(ShipmentStatus.CREATED)).toBe(OrderStatus.SHIPPED);
    expect(logisticsService.mapShipmentStatusToOrderStatus(ShipmentStatus.PICKED_UP)).toBe(OrderStatus.SHIPPED);
    expect(logisticsService.mapShipmentStatusToOrderStatus(ShipmentStatus.IN_TRANSIT)).toBe(OrderStatus.IN_TRANSIT);
    expect(logisticsService.mapShipmentStatusToOrderStatus(ShipmentStatus.OUT_FOR_DELIVERY)).toBe(OrderStatus.IN_TRANSIT);
    expect(logisticsService.mapShipmentStatusToOrderStatus(ShipmentStatus.DELIVERED)).toBe(OrderStatus.DELIVERED);
    expect(logisticsService.mapShipmentStatusToOrderStatus(ShipmentStatus.CANCELLED)).toBe(OrderStatus.CANCELLED);
  });

  it('should cancel shipment via mock adapter', async () => {
    const cancelResult = await logisticsService.cancelShipment('MOCK-SHP-123');
    expect(cancelResult.success).toBe(true);
  });

  it('should accurately calculate logistics estimate with transparent cost breakdown', async () => {
    const estimate = await logisticsService.estimateLogistics({
      origin: { city: 'Nashik', state: 'Maharashtra' },
      destination: { city: 'Pune', state: 'Maharashtra' },
      weightKg: 2500, // 25 Quintals / 2.5 Tonnes
      commodity: 'Tomato',
    });

    expect(estimate).toBeDefined();
    expect(estimate.distanceKm).toBeGreaterThan(0);
    expect(estimate.estimatedCost).toBeGreaterThan(0);
    expect(estimate.perUnitCost).toBeGreaterThan(0);
    expect(estimate.estimatedDays).toBeGreaterThanOrEqual(1);
    expect(estimate.isEstimated).toBe(true);
    expect(estimate.provider).toBe('MOCK_LOGISTICS');
    expect(estimate.costBreakdown).toBeDefined();
    expect(estimate.costBreakdown.baseFare).toBe(400);
    expect(estimate.costBreakdown.distanceFare).toBeGreaterThan(0);
    expect(estimate.costBreakdown.fuelSurcharge).toBeGreaterThan(0);
    expect(estimate.costBreakdown.handling).toBe(375); // 25 quintals * 15
    expect(estimate.limitations?.length).toBeGreaterThan(0);
  });

  it('should resolve district coordinates and generate route with GeoJSON LineString', async () => {
    const route = await logisticsService.getRoute({
      originDistrict: 'Lasalgaon',
      destDistrict: 'Vashi',
    });

    expect(route).toBeDefined();
    expect(route.geometry.type).toBe('LineString');
    expect(route.geometry.coordinates.length).toBeGreaterThanOrEqual(7);
    expect(route.distanceKm).toBeGreaterThan(0);
    expect(route.durationHours).toBeGreaterThan(0);
    expect(['osrm', 'cached', 'fallback']).toContain(route.source);
  });

  it('should fall back gracefully to synthetic 7-point arc on arbitrary coordinates', async () => {
    const route = await logisticsService.getRoute({
      originLat: 20.0,
      originLon: 74.0,
      destLat: 19.0,
      destLon: 73.0,
    });

    expect(route).toBeDefined();
    expect(route.geometry.type).toBe('LineString');
    expect(route.geometry.coordinates.length).toBeGreaterThanOrEqual(7);
    expect(route.distanceKm).toBeGreaterThan(0);
  });
});



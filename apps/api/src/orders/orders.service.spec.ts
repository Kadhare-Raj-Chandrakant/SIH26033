import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { OrderStatus, ShipmentStatus, NotificationType } from '@prisma/client';
import { OrdersService } from './orders.service.js';

describe('OrdersService - Fulfillment & Tracking Unit Tests', () => {
  let ordersService: OrdersService;
  let mockPrisma: any;
  let mockLogisticsService: any;

  beforeEach(() => {
    mockPrisma = {
      buyerProfile: {
        findUnique: vi.fn(),
      },
      sellerProfile: {
        findUnique: vi.fn(),
      },
      order: {
        findFirst: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      shipment: {
        create: vi.fn(),
        update: vi.fn(),
      },
      shipmentTrackingEvent: {
        create: vi.fn(),
      },
      notification: {
        create: vi.fn(),
      },
      $transaction: vi.fn(async (callback) => callback(mockPrisma)),
    };

    mockLogisticsService = {
      providerName: 'MOCK_LOGISTICS',
      getProviderName: vi.fn(() => 'MOCK_LOGISTICS'),
      createShipment: vi.fn(),
      getShipmentStatus: vi.fn(),
      cancelShipment: vi.fn(),
      mapShipmentStatusToOrderStatus: vi.fn((status: ShipmentStatus) => {
        if (status === ShipmentStatus.PICKED_UP) return OrderStatus.SHIPPED;
        if (status === ShipmentStatus.IN_TRANSIT) return OrderStatus.IN_TRANSIT;
        if (status === ShipmentStatus.DELIVERED) return OrderStatus.DELIVERED;
        return null;
      }),
    };

    ordersService = new OrdersService(mockPrisma, mockLogisticsService);
  });

  const sampleSeller = { id: 'seller-123', userId: 'user-seller-1', businessName: 'Fresh Farms' };
  const sampleBuyer = { id: 'buyer-456', userId: 'user-buyer-1' };

  describe('confirmOrder', () => {
    it('should transition PENDING order to CONFIRMED and notify buyer', async () => {
      mockPrisma.sellerProfile.findUnique.mockResolvedValue(sampleSeller);
      mockPrisma.order.findFirst.mockResolvedValue({
        id: 'order-1',
        orderNumber: 'ORD-001',
        status: OrderStatus.PENDING,
        sellerId: sampleSeller.id,
        buyer: sampleBuyer,
      });
      mockPrisma.order.update.mockResolvedValue({
        id: 'order-1',
        status: OrderStatus.CONFIRMED,
      });

      const result = await ordersService.confirmOrder('user-seller-1', 'order-1');

      expect(result.status).toBe(OrderStatus.CONFIRMED);
      expect(mockPrisma.order.update).toHaveBeenCalledWith({
        where: { id: 'order-1' },
        data: { status: OrderStatus.CONFIRMED },
      });
      expect(mockPrisma.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: sampleBuyer.userId,
          type: NotificationType.ORDER_STATUS_UPDATED,
          title: 'Order Confirmed',
        }),
      });
    });

    it('should reject confirmation if order is not in PENDING status', async () => {
      mockPrisma.sellerProfile.findUnique.mockResolvedValue(sampleSeller);
      mockPrisma.order.findFirst.mockResolvedValue({
        id: 'order-1',
        orderNumber: 'ORD-001',
        status: OrderStatus.PROCESSING,
        sellerId: sampleSeller.id,
        buyer: sampleBuyer,
      });

      await expect(ordersService.confirmOrder('user-seller-1', 'order-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('processOrder', () => {
    it('should transition CONFIRMED order to PROCESSING', async () => {
      mockPrisma.sellerProfile.findUnique.mockResolvedValue(sampleSeller);
      mockPrisma.order.findFirst.mockResolvedValue({
        id: 'order-1',
        orderNumber: 'ORD-001',
        status: OrderStatus.CONFIRMED,
        sellerId: sampleSeller.id,
        buyer: sampleBuyer,
      });
      mockPrisma.order.update.mockResolvedValue({
        id: 'order-1',
        status: OrderStatus.PROCESSING,
      });

      const result = await ordersService.processOrder('user-seller-1', 'order-1');

      expect(result.status).toBe(OrderStatus.PROCESSING);
      expect(mockPrisma.order.update).toHaveBeenCalledWith({
        where: { id: 'order-1' },
        data: { status: OrderStatus.PROCESSING },
      });
    });

    it('should reject processing if order is in PENDING status', async () => {
      mockPrisma.sellerProfile.findUnique.mockResolvedValue(sampleSeller);
      mockPrisma.order.findFirst.mockResolvedValue({
        id: 'order-1',
        orderNumber: 'ORD-001',
        status: OrderStatus.PENDING,
        sellerId: sampleSeller.id,
        buyer: sampleBuyer,
      });

      await expect(ordersService.processOrder('user-seller-1', 'order-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('markReadyForShipment', () => {
    it('should transition PROCESSING order to READY_FOR_SHIPMENT', async () => {
      mockPrisma.sellerProfile.findUnique.mockResolvedValue(sampleSeller);
      mockPrisma.order.findFirst.mockResolvedValue({
        id: 'order-1',
        orderNumber: 'ORD-001',
        status: OrderStatus.PROCESSING,
        sellerId: sampleSeller.id,
        buyer: sampleBuyer,
      });
      mockPrisma.order.update.mockResolvedValue({
        id: 'order-1',
        status: OrderStatus.READY_FOR_SHIPMENT,
      });

      const result = await ordersService.markReadyForShipment('user-seller-1', 'order-1');

      expect(result.status).toBe(OrderStatus.READY_FOR_SHIPMENT);
    });

    it('should reject if order is not in PROCESSING status', async () => {
      mockPrisma.sellerProfile.findUnique.mockResolvedValue(sampleSeller);
      mockPrisma.order.findFirst.mockResolvedValue({
        id: 'order-1',
        status: OrderStatus.CONFIRMED,
        sellerId: sampleSeller.id,
        buyer: sampleBuyer,
      });

      await expect(ordersService.markReadyForShipment('user-seller-1', 'order-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('shipOrder', () => {
    const orderData = {
      id: 'order-1',
      orderNumber: 'ORD-001',
      status: OrderStatus.READY_FOR_SHIPMENT,
      sellerId: sampleSeller.id,
      shippingAddressSnapshot: { name: 'Buyer', phone: '1234567890', addressLine: 'Street 1', city: 'Pune' },
      items: [{ product: { name: 'Wheat', unit: 'KG' }, quantity: { toNumber: () => 10 } }],
      seller: { businessName: 'Farms', farmLocation: 'Loc', user: { mobile: '9876543210' } },
      buyer: { userId: 'buyer-user-id' },
      shipment: null,
    };

    it('should stage shipment, call logistics provider outside transaction, and advance order to SHIPPED', async () => {
      mockPrisma.sellerProfile.findUnique.mockResolvedValue(sampleSeller);
      mockPrisma.order.findFirst.mockResolvedValue(orderData);
      mockPrisma.order.findUnique.mockResolvedValue(orderData);

      mockPrisma.shipment.create.mockResolvedValue({
        id: 'ship-1',
        orderId: 'order-1',
        provider: 'MOCK_LOGISTICS',
        status: ShipmentStatus.CREATED,
      });

      mockLogisticsService.createShipment.mockResolvedValue({
        provider: 'MOCK_LOGISTICS',
        providerShipmentId: 'MOCK-1',
        trackingNumber: 'TRK-001',
        status: ShipmentStatus.PICKED_UP,
        estimatedDeliveryAt: new Date(),
      });

      mockPrisma.shipment.update.mockResolvedValue({
        id: 'ship-1',
        provider: 'MOCK_LOGISTICS',
        providerShipmentId: 'MOCK-1',
        trackingNumber: 'TRK-001',
        status: ShipmentStatus.PICKED_UP,
        estimatedDeliveryAt: new Date(),
        shippedAt: new Date(),
      });

      mockPrisma.order.update.mockResolvedValue({
        id: 'order-1',
        status: OrderStatus.SHIPPED,
      });

      const result = await ordersService.shipOrder('user-seller-1', 'order-1');

      expect(mockPrisma.shipment.create).toHaveBeenCalled();
      expect(mockLogisticsService.createShipment).toHaveBeenCalled();
      expect(mockPrisma.shipment.update).toHaveBeenCalled();
      expect(mockPrisma.order.update).toHaveBeenCalledWith({
        where: { id: 'order-1' },
        data: { status: OrderStatus.SHIPPED },
      });
      expect(result.status).toBe(OrderStatus.SHIPPED);
      expect(result.shipment.trackingNumber).toBe('TRK-001');
    });

    it('should mark shipment FAILED and keep order READY_FOR_SHIPMENT if provider fails', async () => {
      mockPrisma.sellerProfile.findUnique.mockResolvedValue(sampleSeller);
      mockPrisma.order.findFirst.mockResolvedValue(orderData);
      mockPrisma.order.findUnique.mockResolvedValue(orderData);

      mockPrisma.shipment.create.mockResolvedValue({
        id: 'ship-1',
        orderId: 'order-1',
        provider: 'MOCK_LOGISTICS',
        status: ShipmentStatus.CREATED,
      });

      mockLogisticsService.createShipment.mockRejectedValue(
        new Error('Carrier network unreachable'),
      );

      mockPrisma.shipment.update.mockResolvedValue({
        id: 'ship-1',
        status: ShipmentStatus.FAILED,
      });

      await expect(ordersService.shipOrder('user-seller-1', 'order-1')).rejects.toThrow(
        'Carrier network unreachable',
      );

      expect(mockPrisma.shipment.update).toHaveBeenCalledWith({
        where: { id: 'ship-1' },
        data: { status: ShipmentStatus.FAILED },
      });
    });

    it('should emergency-record provider reference and throw 500 if Phase 3 persistence fails', async () => {
      mockPrisma.sellerProfile.findUnique.mockResolvedValue(sampleSeller);
      mockPrisma.order.findFirst.mockResolvedValue(orderData);
      mockPrisma.order.findUnique.mockResolvedValue(orderData);

      mockPrisma.shipment.create.mockResolvedValue({
        id: 'ship-1',
        orderId: 'order-1',
        provider: 'MOCK_LOGISTICS',
        status: ShipmentStatus.CREATED,
      });

      mockLogisticsService.createShipment.mockResolvedValue({
        provider: 'MOCK_LOGISTICS',
        providerShipmentId: 'MOCK-1',
        trackingNumber: 'TRK-001',
        status: ShipmentStatus.PICKED_UP,
        estimatedDeliveryAt: new Date(),
      });

      // simulatePersistenceFailure: true
      await expect(
        ordersService.shipOrder('user-seller-1', 'order-1', { simulatePersistenceFailure: true }),
      ).rejects.toThrow('Logistics carrier dispatch succeeded with reference MOCK-1');

      // Emergency preserve provider reference was called
      expect(mockPrisma.shipment.update).toHaveBeenCalledWith({
        where: { id: 'ship-1' },
        data: {
          providerShipmentId: 'MOCK-1',
          trackingNumber: 'TRK-001',
          status: ShipmentStatus.CREATED,
        },
      });
    });

    it('should reconcile existing provider consignment without re-calling carrier on retry', async () => {
      mockPrisma.sellerProfile.findUnique.mockResolvedValue(sampleSeller);
      // Order already has a shipment with providerShipmentId (from prior failed persistence)
      const reconciledOrderData = {
        ...orderData,
        shipment: {
          id: 'ship-1',
          orderId: 'order-1',
          provider: 'MOCK_LOGISTICS',
          providerShipmentId: 'MOCK-1',
          trackingNumber: 'TRK-001',
          status: ShipmentStatus.CREATED,
        },
      };
      mockPrisma.order.findFirst.mockResolvedValue(reconciledOrderData);

      mockPrisma.shipment.update.mockResolvedValue({
        id: 'ship-1',
        provider: 'MOCK_LOGISTICS',
        providerShipmentId: 'MOCK-1',
        trackingNumber: 'TRK-001',
        status: ShipmentStatus.PICKED_UP,
        estimatedDeliveryAt: new Date(),
        shippedAt: new Date(),
      });

      mockPrisma.order.update.mockResolvedValue({
        id: 'order-1',
        status: OrderStatus.SHIPPED,
      });

      mockLogisticsService.createShipment.mockClear();

      const result = await ordersService.shipOrder('user-seller-1', 'order-1');

      // Provider was NOT called again!
      expect(mockLogisticsService.createShipment).not.toHaveBeenCalled();
      expect(result.status).toBe(OrderStatus.SHIPPED);
      expect(result.shipment.providerShipmentId).toBe('MOCK-1');
    });

    it('should reject if order is not in READY_FOR_SHIPMENT status', async () => {
      mockPrisma.sellerProfile.findUnique.mockResolvedValue(sampleSeller);
      mockPrisma.order.findFirst.mockResolvedValue({
        ...orderData,
        status: OrderStatus.PROCESSING,
      });

      await expect(ordersService.shipOrder('user-seller-1', 'order-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should reject if order already has an active delivered/shipped shipment', async () => {
      mockPrisma.sellerProfile.findUnique.mockResolvedValue(sampleSeller);
      mockPrisma.order.findFirst.mockResolvedValue({
        ...orderData,
        shipment: { id: 'existing-shipment', status: ShipmentStatus.PICKED_UP },
      });

      await expect(ordersService.shipOrder('user-seller-1', 'order-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('getOrderTracking', () => {
    it('should return tracking details with chronological events for owned buyer order', async () => {
      mockPrisma.buyerProfile.findUnique.mockResolvedValue(sampleBuyer);
      mockPrisma.order.findFirst.mockResolvedValue({
        id: 'order-1',
        orderNumber: 'ORD-001',
        status: OrderStatus.SHIPPED,
        buyerId: sampleBuyer.id,
        shipment: {
          id: 'ship-1',
          provider: 'MOCK_LOGISTICS',
          trackingNumber: 'TRK-001',
          status: ShipmentStatus.PICKED_UP,
          estimatedDeliveryAt: new Date('2026-09-15'),
          shippedAt: new Date('2026-09-11'),
          deliveredAt: null,
          events: [
            { id: 'e-1', status: ShipmentStatus.PICKED_UP, location: 'Hub', message: 'Picked up', occurredAt: new Date() },
          ],
        },
      });

      const result = await ordersService.getOrderTracking('user-buyer-1', 'order-1');

      expect(result.orderNumber).toBe('ORD-001');
      expect(result.shipment?.trackingNumber).toBe('TRK-001');
      expect(result.shipment?.events.length).toBe(1);
    });

    it('should throw NotFoundException if order does not belong to buyer', async () => {
      mockPrisma.buyerProfile.findUnique.mockResolvedValue(sampleBuyer);
      mockPrisma.order.findFirst.mockResolvedValue(null);

      await expect(ordersService.getOrderTracking('user-buyer-1', 'non-existent-or-other-buyer')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});

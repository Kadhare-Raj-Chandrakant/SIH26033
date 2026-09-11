import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { AdminService } from './admin.service.js';
import { AuditLogService } from './audit-log.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

describe('AdminService', () => {
  let service: AdminService;

  const mockPrisma = {
    user: {
      count: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    product: {
      count: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    sellerProfile: {
      count: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    category: {
      count: vi.fn(),
    },
    order: {
      count: vi.fn(),
      groupBy: vi.fn(),
      aggregate: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
    payment: {
      count: vi.fn(),
      groupBy: vi.fn(),
      aggregate: vi.fn(),
      findMany: vi.fn(),
    },
    shipment: {
      count: vi.fn(),
      groupBy: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
    moderationReport: {
      count: vi.fn(),
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    auditLog: {
      findMany: vi.fn(),
    },
  };

  const mockAuditLogService = {
    logAction: vi.fn(),
    findAll: vi.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuditLogService, useValue: mockAuditLogService },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
    vi.clearAllMocks();
  });

  describe('getDashboard', () => {
    it('should aggregate metrics across users, products, orders, payments, shipments, and moderation', async () => {
      mockPrisma.user.count.mockResolvedValue(100);
      mockPrisma.product.count.mockResolvedValue(50);
      mockPrisma.category.count.mockResolvedValue(10);
      mockPrisma.sellerProfile.count.mockResolvedValue(25);
      mockPrisma.order.count.mockResolvedValue(30);
      mockPrisma.order.groupBy.mockResolvedValue([
        { status: 'DELIVERED', _count: { id: 20 } },
        { status: 'PENDING', _count: { id: 10 } },
      ]);
      mockPrisma.order.aggregate.mockResolvedValue({ _sum: { totalAmount: 150000 } });
      mockPrisma.payment.count.mockResolvedValue(30);
      mockPrisma.payment.groupBy.mockResolvedValue([{ status: 'COMPLETED', _count: { id: 25 } }]);
      mockPrisma.payment.aggregate.mockResolvedValue({ _sum: { amount: 125000 } });
      mockPrisma.shipment.count.mockResolvedValue(25);
      mockPrisma.shipment.groupBy.mockResolvedValue([{ status: 'DELIVERED', _count: { id: 20 } }]);
      mockPrisma.moderationReport.count.mockResolvedValue(3);
      mockPrisma.auditLog.findMany.mockResolvedValue([]);

      const dashboard = await service.getDashboard();

      expect(dashboard.users.total).toBe(100);
      expect(dashboard.marketplace.totalProducts).toBe(50);
      expect(dashboard.orders.total).toBe(30);
      expect(dashboard.orders.totalVolume).toBe(150000);
      expect(dashboard.payments.totalSettledAmount).toBe(125000);
      expect(dashboard.moderation.pendingReports).toBe(6); // open (3) + underReview (3)
    });
  });

  describe('updateUserStatus', () => {
    it('should reject administrator self-deactivation', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'admin-1',
        email: 'admin@example.com',
        status: 'ACTIVE',
      });

      await expect(
        service.updateUserStatus('admin-1', { status: 'SUSPENDED' }, 'admin-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should successfully update user status and record audit log', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-123',
        email: 'badactor@example.com',
        status: 'ACTIVE',
      });
      mockPrisma.user.update.mockResolvedValue({
        id: 'user-123',
        email: 'badactor@example.com',
        status: 'SUSPENDED',
      });

      const res = await service.updateUserStatus(
        'user-123',
        { status: 'SUSPENDED', reason: 'Fraudulent listings' },
        'admin-1',
      );

      expect(res.status).toBe('SUSPENDED');
      expect(mockAuditLogService.logAction).toHaveBeenCalledWith(
        expect.objectContaining({
          actorUserId: 'admin-1',
          action: 'USER_STATUS_UPDATE',
          entityType: 'USER',
          entityId: 'user-123',
        }),
      );
    });
  });

  describe('verifySeller', () => {
    it('should update seller verification status and record audit log', async () => {
      mockPrisma.sellerProfile.findUnique.mockResolvedValue({
        id: 'seller-1',
        verificationStatus: 'PENDING',
      });
      mockPrisma.sellerProfile.update.mockResolvedValue({
        id: 'seller-1',
        verificationStatus: 'VERIFIED',
      });

      const res = await service.verifySeller(
        'seller-1',
        { verificationStatus: 'VERIFIED', reason: 'Verified via land records' },
        'admin-1',
      );

      expect(res.verificationStatus).toBe('VERIFIED');
      expect(mockAuditLogService.logAction).toHaveBeenCalledWith(
        expect.objectContaining({
          actorUserId: 'admin-1',
          action: 'SELLER_VERIFICATION',
          entityType: 'SELLER',
          entityId: 'seller-1',
          newState: { verificationStatus: 'VERIFIED' },
        }),
      );
    });
  });

  describe('moderateProduct', () => {
    it('should reject transition to the exact same status', async () => {
      mockPrisma.product.findUnique.mockResolvedValue({
        id: 'prod-1',
        status: 'ACTIVE',
      });

      await expect(
        service.moderateProduct('prod-1', { status: 'ACTIVE' }, 'admin-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject invalid state transitions (e.g. REJECTED -> OUT_OF_STOCK)', async () => {
      mockPrisma.product.findUnique.mockResolvedValue({
        id: 'prod-1',
        status: 'REJECTED',
      });

      await expect(
        service.moderateProduct('prod-1', { status: 'OUT_OF_STOCK' }, 'admin-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should approve valid transition (ACTIVE -> REJECTED) and log audit record', async () => {
      mockPrisma.product.findUnique.mockResolvedValue({
        id: 'prod-1',
        status: 'ACTIVE',
      });
      mockPrisma.product.update.mockResolvedValue({
        id: 'prod-1',
        status: 'REJECTED',
      });

      const res = await service.moderateProduct(
        'prod-1',
        { status: 'REJECTED', reason: 'Misleading description' },
        'admin-1',
      );

      expect(res.status).toBe('REJECTED');
      expect(mockAuditLogService.logAction).toHaveBeenCalledWith(
        expect.objectContaining({
          actorUserId: 'admin-1',
          action: 'PRODUCT_MODERATION',
          entityType: 'PRODUCT',
          entityId: 'prod-1',
          newState: { status: 'REJECTED' },
        }),
      );
    });

    it('should allow re-activation of previously rejected product (REJECTED -> ACTIVE)', async () => {
      mockPrisma.product.findUnique.mockResolvedValue({
        id: 'prod-1',
        status: 'REJECTED',
      });
      mockPrisma.product.update.mockResolvedValue({
        id: 'prod-1',
        status: 'ACTIVE',
      });

      const res = await service.moderateProduct(
        'prod-1',
        { status: 'ACTIVE', reason: 'Seller corrected documentation' },
        'admin-1',
      );

      expect(res.status).toBe('ACTIVE');
      expect(mockAuditLogService.logAction).toHaveBeenCalledWith(
        expect.objectContaining({
          actorUserId: 'admin-1',
          action: 'PRODUCT_MODERATION',
          previousState: { status: 'REJECTED' },
          newState: { status: 'ACTIVE' },
        }),
      );
    });
  });

  describe('reviewReport', () => {
    it('should resolve a moderation report and log audit entry with admin ID', async () => {
      mockPrisma.moderationReport.findUnique.mockResolvedValue({
        id: 'rep-1',
        status: 'OPEN',
      });
      mockPrisma.moderationReport.update.mockResolvedValue({
        id: 'rep-1',
        status: 'RESOLVED',
        resolutionNotes: 'Listing removed and seller warned',
        reviewedByUserId: 'admin-1',
      });

      const res = await service.reviewReport(
        'rep-1',
        { status: 'RESOLVED', resolutionNotes: 'Listing removed and seller warned' },
        'admin-1',
      );

      expect(res.status).toBe('RESOLVED');
      expect(mockAuditLogService.logAction).toHaveBeenCalledWith(
        expect.objectContaining({
          actorUserId: 'admin-1',
          action: 'REPORT_RESOLUTION',
          entityType: 'REPORT',
          entityId: 'rep-1',
          newState: { status: 'RESOLVED' },
        }),
      );
    });
  });
});

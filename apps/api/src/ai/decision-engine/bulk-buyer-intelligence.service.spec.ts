import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { BulkBuyerIntelligenceService } from './bulk-buyer-intelligence.service.js';
import { LogisticsService } from '../../logistics/logistics.service.js';
import { MockLogisticsProvider } from '../../logistics/providers/mock-logistics.provider.js';

describe('BulkBuyerIntelligenceService', () => {
  let service: BulkBuyerIntelligenceService;
  let mockPrisma: any;
  let logisticsService: LogisticsService;
  let mockProvider: MockLogisticsProvider;

  beforeEach(() => {
    mockProvider = new MockLogisticsProvider();
    logisticsService = new LogisticsService({ get: () => 'mock' } as any, mockProvider);
    mockPrisma = {
      fpoOrganization: {
        findFirst: vi.fn(),
      },
    };
    service = new BulkBuyerIntelligenceService(mockPrisma, logisticsService);
  });

  it('should compare competing Tomato RFQs (Scenarios A, B, C, D) and enforce FPO capacity constraints', async () => {
    mockPrisma.fpoOrganization.findFirst.mockResolvedValue({
      id: 'fpo-sahyadri',
      name: 'Sahyadri Farmers Producer Co.',
      state: 'Maharashtra',
      district: 'Nashik',
      batches: [
        {
          commodity: 'Tomato',
          totalQuantityQuintals: 150,
          allocatedQuantityQuintals: 0,
        },
      ],
      listings: [],
    });

    const result = await service.evaluateBulkRfqsForFpo('fpo-sahyadri', 'Tomato');

    expect(result).toBeDefined();
    expect(result.fpo.name).toBe('Sahyadri Farmers Producer Co.');
    expect(result.commodity).toBe('Tomato');
    expect(result.fpoCapacityQuintals).toBe(150);
    expect(result.rfqs.length).toBe(4);

    const rfqA = result.rfqs.find((r) => r.scenario === 'A');
    const rfqB = result.rfqs.find((r) => r.scenario === 'B');
    const rfqC = result.rfqs.find((r) => r.scenario === 'C');
    const rfqD = result.rfqs.find((r) => r.scenario === 'D');

    expect(rfqA).toBeDefined();
    expect(rfqB).toBeDefined();
    expect(rfqC).toBeDefined();
    expect(rfqD).toBeDefined();

    // Verify Capacity Status:
    // RFQ A (80 Q <= 150 Q): FULLY_FULFILLABLE
    expect(rfqA?.capacityStatus).toBe('FULLY_FULFILLABLE');
    // RFQ B (110 Q <= 150 Q): FULLY_FULFILLABLE
    expect(rfqB?.capacityStatus).toBe('FULLY_FULFILLABLE');
    // RFQ C (140 Q <= 150 Q): FULLY_FULFILLABLE
    expect(rfqC?.capacityStatus).toBe('FULLY_FULFILLABLE');
    // RFQ D (220 Q > 150 Q): PARTIALLY_FULFILLABLE (stress test constraint!)
    expect(rfqD?.capacityStatus).toBe('PARTIALLY_FULFILLABLE');

    // Verify economic trade-off: RFQ A has lower logistics burden than inter-state RFQ C
    expect(rfqA?.roadDistanceKm).toBeLessThan(rfqC!.roadDistanceKm);
    expect(rfqA?.estimatedLogisticsCostPerQuintal).toBeLessThan(rfqC!.estimatedLogisticsCostPerQuintal);
    expect(rfqA?.estimatedNetPerQuintal).toBeGreaterThan(rfqC!.estimatedNetPerQuintal);

    // Verify top recommendation is economically viable and fully fulfillable
    expect(result.recommendedRfq?.capacityStatus).toBe('FULLY_FULFILLABLE');
    expect(result.recommendedRfq?.isEconomicallyRecommended).toBe(true);

    // Verify trade-offs are explained for all 4 scenarios
    expect(result.tradeoffs.length).toBe(4);
    expect(result.sideBySideComparisonSummary.length).toBeGreaterThan(20);
  });

  it('should rank FULLY_FULFILLABLE RFQ above over-capacity RFQs even if over-capacity RFQs offer higher prices', async () => {
    // Capacity 90 Q: RFQ A (80 Q) is fully fulfillable, others (110 Q, 140 Q, 220 Q) are partially fulfillable
    mockPrisma.fpoOrganization.findFirst.mockResolvedValue({
      id: 'fpo-constrained',
      name: 'Constrained Cooperative',
      state: 'Maharashtra',
      district: 'Nashik',
      batches: [
        {
          commodity: 'Tomato',
          totalQuantityQuintals: 90,
          allocatedQuantityQuintals: 0,
        },
      ],
      listings: [],
    });

    const result = await service.evaluateBulkRfqsForFpo('fpo-constrained', 'Tomato');

    expect(result.fpoCapacityQuintals).toBe(90);
    // Rank 1 MUST be FULLY_FULFILLABLE
    expect(result.rfqs[0].capacityStatus).toBe('FULLY_FULFILLABLE');
    expect(result.rfqs[0].rfqId).toBe('RFQ-TOM-A');
    expect(result.rfqs[0].isEconomicallyRecommended).toBe(true);

    // Over-capacity RFQs must be ranked lower
    const overCapacity = result.rfqs.slice(1);
    for (const rfq of overCapacity) {
      expect(rfq.capacityStatus).toBe('PARTIALLY_FULFILLABLE');
      expect(rfq.isEconomicallyRecommended).toBe(false);
      expect(rfq.tradeoffExplanation).toContain('Partially Fulfillable');
    }
  });

  it('should not recommend any RFQ when FPO has zero or non-fulfillable capacity', async () => {
    mockPrisma.fpoOrganization.findFirst.mockResolvedValue({
      id: 'fpo-empty',
      name: 'Zero Capacity FPO',
      state: 'Maharashtra',
      district: 'Nashik',
      batches: [
        {
          commodity: 'Tomato',
          totalQuantityQuintals: 0,
          allocatedQuantityQuintals: 0,
        },
      ],
      listings: [
        {
          commodity: 'Tomato',
          quantityQuintals: 0,
        },
      ],
    });

    // Mock baseline to return minimal 0
    vi.spyOn(service as any, 'loadFrozenRfqs');

    // Simulate capacity = 20 Q where minimum RFQ is 80 Q
    mockPrisma.fpoOrganization.findFirst.mockResolvedValue({
      id: 'fpo-tiny',
      name: 'Small Holding FPO',
      state: 'Maharashtra',
      district: 'Nashik',
      batches: [
        {
          commodity: 'Tomato',
          totalQuantityQuintals: 20,
        },
      ],
      listings: [],
    });

    const result = await service.evaluateBulkRfqsForFpo('fpo-tiny', 'Tomato');

    expect(result.fpoCapacityQuintals).toBe(20);
    expect(result.recommendedRfq).toBeNull();
    for (const rfq of result.rfqs) {
      expect(rfq.capacityStatus).not.toBe('FULLY_FULFILLABLE');
      expect(rfq.isEconomicallyRecommended).toBe(false);
    }
    expect(result.sideBySideComparisonSummary).toContain('no competing RFQ is currently fully fulfillable');
  });

  it('should trigger carrier rate card fallback when exact bulk lane is missing', async () => {
    mockPrisma.fpoOrganization.findFirst.mockResolvedValue({
      id: 'fpo-sahyadri',
      name: 'Sahyadri Farmers Producer Co.',
      state: 'Maharashtra',
      district: 'Nashik',
      batches: [{ commodity: 'Tomato', totalQuantityQuintals: 200 }],
      listings: [],
    });

    vi.spyOn(logisticsService, 'findBuyerBulkLane').mockReturnValue(null);
    const estimateSpy = vi.spyOn(logisticsService, 'estimateLogistics');

    const result = await service.evaluateBulkRfqsForFpo('fpo-sahyadri', 'Tomato');

    expect(estimateSpy).toHaveBeenCalled();
    expect(result.rfqs.length).toBeGreaterThan(0);
    for (const rfq of result.rfqs) {
      expect(rfq.estimatedLogisticsCostPerQuintal).toBeGreaterThan(0);
      expect(rfq.estimatedNetPerQuintal).toBe(
        Math.round((rfq.targetPriceInrPerQuintal - rfq.estimatedLogisticsCostPerQuintal) * 100) / 100,
      );
    }
  });

  it('should handle unsupported commodity gracefully with empty results', async () => {
    mockPrisma.fpoOrganization.findFirst.mockResolvedValue({
      id: 'fpo-sahyadri',
      name: 'Sahyadri Farmers Producer Co.',
      state: 'Maharashtra',
      district: 'Nashik',
      batches: [],
      listings: [],
    });

    const result = await service.evaluateBulkRfqsForFpo('fpo-sahyadri', 'ExoticDragonFruit');

    expect(result.rfqs.length).toBe(0);
    expect(result.recommendedRfq).toBeNull();
    expect(result.sideBySideComparisonSummary).toContain('No active bulk buyer RFQs found');
  });

  it('should throw ForbiddenException on cross-FPO ID tampering when user does not manage or belong to FPO', async () => {
    mockPrisma.fpoOrganization.findFirst.mockResolvedValue({
      id: 'fpo-sahyadri',
      name: 'Sahyadri Farmers Producer Co.',
      adminId: 'admin-sahyadri',
      state: 'Maharashtra',
      district: 'Nashik',
      batches: [],
      listings: [],
      memberships: [],
    });

    await expect(
      service.evaluateBulkRfqsForFpo('fpo-sahyadri', 'Tomato', {
        id: 'attacker-or-other-user',
        role: Role.FPO,
      }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('should throw NotFoundException when FPO does not exist (NO silent fallback to Sahyadri)', async () => {
    mockPrisma.fpoOrganization.findFirst.mockResolvedValue(null);

    await expect(
      service.evaluateBulkRfqsForFpo('fpo-nonexistent', 'Tomato'),
    ).rejects.toThrow(NotFoundException);
  });

  it('should allow platform ADMIN to inspect any FPO intelligence', async () => {
    mockPrisma.fpoOrganization.findFirst.mockResolvedValue({
      id: 'fpo-sahyadri',
      name: 'Sahyadri Farmers Producer Co.',
      adminId: 'admin-sahyadri',
      state: 'Maharashtra',
      district: 'Nashik',
      batches: [{ commodity: 'Tomato', totalQuantityQuintals: 100 }],
      listings: [],
      memberships: [],
    });

    const result = await service.evaluateBulkRfqsForFpo('fpo-sahyadri', 'Tomato', {
      id: 'platform-admin-user',
      role: Role.ADMIN,
    });

    expect(result).toBeDefined();
    expect(result.fpo.name).toBe('Sahyadri Farmers Producer Co.');
  });

  it('should allow approved member farmer to access their FPO bulk intelligence', async () => {
    mockPrisma.fpoOrganization.findFirst.mockResolvedValue({
      id: 'fpo-sahyadri',
      name: 'Sahyadri Farmers Producer Co.',
      adminId: 'admin-sahyadri',
      state: 'Maharashtra',
      district: 'Nashik',
      batches: [{ commodity: 'Tomato', totalQuantityQuintals: 100 }],
      listings: [],
      memberships: [{ farmerId: 'farmer-member-id' }],
    });

    const result = await service.evaluateBulkRfqsForFpo('fpo-sahyadri', 'Tomato', {
      id: 'farmer-member-id',
      role: Role.FARMER,
    });

    expect(result).toBeDefined();
    expect(result.fpo.name).toBe('Sahyadri Farmers Producer Co.');
  });

  it('should use exact buyer bulk lane as PRIMARY and NEVER invoke carrier rate card when exact lane exists', async () => {
    mockPrisma.fpoOrganization.findFirst.mockResolvedValue({
      id: 'fpo-sahyadri',
      name: 'Sahyadri Farmers Producer Co.',
      state: 'Maharashtra',
      district: 'Nashik',
      batches: [{ commodity: 'Tomato', totalQuantityQuintals: 200 }],
      listings: [],
    });

    const estimateSpy = vi.spyOn(logisticsService, 'estimateLogistics');

    const result = await service.evaluateBulkRfqsForFpo('fpo-sahyadri', 'Tomato');

    // Nashik -> Mumbai / Pune / Delhi / Bengaluru all exist in buyer_bulk_lanes.csv
    expect(result.rfqs.length).toBeGreaterThan(0);
    // Exact lanes are matched from dataset, so estimateLogistics must NEVER be invoked
    expect(estimateSpy).not.toHaveBeenCalled();
    expect(result.rfqs[0].freightInrPerQuintal).toBeGreaterThan(0);
  });
});

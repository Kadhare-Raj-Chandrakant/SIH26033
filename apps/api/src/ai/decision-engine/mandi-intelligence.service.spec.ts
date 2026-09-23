import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MandiIntelligenceService } from './mandi-intelligence.service.js';
import { LogisticsService } from '../../logistics/logistics.service.js';
import { MockLogisticsProvider } from '../../logistics/providers/mock-logistics.provider.js';

describe('MandiIntelligenceService', () => {
  let service: MandiIntelligenceService;
  let mockPrisma: any;
  let logisticsService: LogisticsService;
  let mockProvider: MockLogisticsProvider;

  beforeEach(() => {
    mockProvider = new MockLogisticsProvider();
    logisticsService = new LogisticsService({ get: () => 'mock' } as any, mockProvider);
    mockPrisma = {
      user: {
        findUnique: vi.fn(),
      },
    };
    service = new MandiIntelligenceService(mockPrisma, logisticsService);
  });

  it('should evaluate 3 candidate local mandis with deterministic net realization waterfall', async () => {
    const result = await service.getFarmerMandiIntelligence({
      commodity: 'Tomato',
      state: 'Maharashtra',
      district: 'Nashik',
      quantityQuintals: 50,
    });

    expect(result).toBeDefined();
    expect(result.commodity).toBe('Tomato');
    expect(result.farmerOrigin.district).toBe('Nashik');
    expect(result.farmerOrigin.state).toBe('Maharashtra');
    expect(result.candidates.length).toBe(3);

    // Verify deterministic formula: Net Realization = Modal Price - Freight - Handling - Loading
    for (const c of result.candidates) {
      expect(c.totalDeductionsPerQuintal).toBe(
        Math.round((c.freightPerQuintal + c.handlingPerQuintal + c.loadingPerQuintal) * 100) / 100,
      );
      expect(c.estimatedNetRealizationPerQuintal).toBe(
        Math.round((c.modalPrice - c.totalDeductionsPerQuintal) * 100) / 100,
      );
      expect(c.totalNetRealization).toBe(
        Math.round(c.estimatedNetRealizationPerQuintal * 50 * 100) / 100,
      );
    }

    // Verify ranking
    expect(result.candidates[0].rank).toBe(1);
    expect(result.candidates[0].isRecommended).toBe(true);
    expect(result.recommendedMandi).toBe(result.candidates[0]);

    // Verify explanation exists and does not just state a winner
    expect(result.recommendationRationale.length).toBeGreaterThan(20);
    expect(result.calculationFormula).toContain('Mandi Modal Price - Freight - Handling - Loading');
  });

  it('should automatically resolve farmer registered address from database when userId is provided', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'farmer-1',
      addresses: [
        {
          state: 'Maharashtra',
          district: 'Nashik',
          city: 'Nashik',
          addressLine: 'Plot 42, Dindori Road Agro Cluster',
          isDefault: true,
        },
      ],
      sellerProfile: null,
    });

    const result = await service.getFarmerMandiIntelligence({
      userId: 'farmer-1',
      commodity: 'Tomato',
    });

    expect(mockPrisma.user.findUnique).toHaveBeenCalled();
    expect(result.farmerOrigin.source).toBe('REGISTERED_ADDRESS');
    expect(result.farmerOrigin.state).toBe('Maharashtra');
    expect(result.farmerOrigin.district).toBe('Nashik');
  });

  it('should return UNRESOLVED_LOCATION and empty candidates when farmer has no usable registered address and no explicit location', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'farmer-no-addr',
      addresses: [],
      sellerProfile: null,
    });

    const result = await service.getFarmerMandiIntelligence({
      userId: 'farmer-no-addr',
      commodity: 'Tomato',
    });

    expect(result).toBeDefined();
    expect(result.farmerOrigin.source).toBe('UNRESOLVED_LOCATION');
    expect(result.candidates.length).toBe(0);
    expect(result.recommendedMandi).toBeNull();
    expect(result.recommendationRationale).toContain('No usable registered farm address or location parameter was found');
  });

  it('should return clear no-data result when commodity is unsupported (NEVER silently fall back to Tomato or Nashik)', async () => {
    const result = await service.getFarmerMandiIntelligence({
      commodity: 'ExoticDragonFruit',
      state: 'Maharashtra',
      district: 'Nashik',
      quantityQuintals: 10,
    });

    expect(result).toBeDefined();
    expect(result.candidates.length).toBe(0);
    expect(result.recommendedMandi).toBeNull();
    expect(result.recommendationRationale).toContain('Commodity "ExoticDragonFruit" is not supported');
    expect(result.recommendationRationale).not.toContain('Nashik APMC');
  });

  it('should return clear no-data result when district or state cannot be matched in mandi records', async () => {
    const result = await service.getFarmerMandiIntelligence({
      commodity: 'Tomato',
      state: 'NonExistentState',
      district: 'NonExistentDistrict',
      quantityQuintals: 25,
    });

    expect(result).toBeDefined();
    expect(result.candidates.length).toBe(0);
    expect(result.recommendedMandi).toBeNull();
    expect(result.recommendationRationale).toContain('No local mandi price records found');
  });

  it('should use exact farmer-mandi lane as PRIMARY and NEVER invoke carrier rate card when exact lane exists', async () => {
    const estimateSpy = vi.spyOn(logisticsService, 'estimateLogistics');

    const result = await service.getFarmerMandiIntelligence({
      commodity: 'Tomato',
      state: 'Maharashtra',
      district: 'Nashik',
      quantityQuintals: 50,
    });

    expect(result.candidates.length).toBe(3);
    // Exact lane found in farmer_mandi_lanes.csv -> estimateLogistics must NEVER be invoked
    expect(estimateSpy).not.toHaveBeenCalled();
    expect(result.candidates[0].freightPerQuintal).toBeGreaterThan(0);
  });

  it('should execute carrier rate card fallback when exact farmer-mandi lane is missing', async () => {
    // Force lane lookup to return null
    vi.spyOn(logisticsService, 'findFarmerMandiLane').mockReturnValue(null);
    const estimateSpy = vi.spyOn(logisticsService, 'estimateLogistics');

    const result = await service.getFarmerMandiIntelligence({
      commodity: 'Tomato',
      state: 'Maharashtra',
      district: 'Nashik',
      quantityQuintals: 40,
    });

    expect(estimateSpy).toHaveBeenCalled();
    expect(result.candidates.length).toBe(3);
    for (const c of result.candidates) {
      expect(c.freightPerQuintal).toBeGreaterThan(0);
      expect(c.estimatedNetRealizationPerQuintal).toBe(
        Math.round((c.modalPrice - c.totalDeductionsPerQuintal) * 100) / 100,
      );
    }
  });
});

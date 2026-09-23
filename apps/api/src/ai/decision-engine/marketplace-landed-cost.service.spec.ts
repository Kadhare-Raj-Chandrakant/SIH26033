import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MarketplaceLandedCostService } from './marketplace-landed-cost.service.js';
import { LogisticsService } from '../../logistics/logistics.service.js';
import { MockLogisticsProvider } from '../../logistics/providers/mock-logistics.provider.js';

describe('MarketplaceLandedCostService', () => {
  let service: MarketplaceLandedCostService;
  let mockPrisma: any;
  let logisticsService: LogisticsService;
  let mockProvider: MockLogisticsProvider;

  beforeEach(() => {
    mockProvider = new MockLogisticsProvider();
    logisticsService = new LogisticsService({ get: () => 'mock' } as any, mockProvider);
    mockPrisma = {
      product: {
        findMany: vi.fn(),
      },
      user: {
        findUnique: vi.fn(),
      },
    };
    service = new MarketplaceLandedCostService(mockPrisma, logisticsService);
  });

  it('should calculate Total Landed Cost = Product Price + Logistics and correctly rank options', async () => {
    mockPrisma.product.findMany.mockResolvedValue([
      {
        id: 'prod-near',
        name: 'Nashik Red Onions (Near Farm)',
        price: 3200,
        illustrativeFarmerListingReferenceInr: 3200,
        unit: 'QUINTAL',
        state: 'Maharashtra',
        district: 'Nashik',
        category: { name: 'Vegetables' },
        seller: { businessName: 'Ramesh Patel' },
        inventory: { availableQuantity: 100 },
      },
      {
        id: 'prod-far',
        name: 'Darjeeling Rice (Far Haul)',
        price: 3000, // Cheaper list price!
        illustrativeFarmerListingReferenceInr: 3000,
        unit: 'QUINTAL',
        state: 'West Bengal',
        district: 'Darjeeling',
        category: { name: 'Grains' },
        seller: { businessName: 'Himalayan Producer' },
        inventory: { availableQuantity: 80 },
      },
    ]);

    const result = await service.calculateLandedCosts({
      buyerDestination: {
        state: 'Maharashtra',
        city: 'Mumbai',
        district: 'Mumbai',
      },
      quantityQuintals: 10,
    });

    expect(result).toBeDefined();
    expect(result.products.length).toBe(2);

    for (const p of result.products) {
      expect(p.totalLandedCostPerQuintal).toBe(
        Math.round((p.productPricePerQuintal + p.logisticsCostPerQuintal) * 100) / 100,
      );
      expect(p.totalLandedOrderCost).toBe(
        Math.round(p.totalLandedCostPerQuintal * 10 * 100) / 100,
      );
    }

    const nearProd = result.products.find((p) => p.productId === 'prod-near');
    const farProd = result.products.find((p) => p.productId === 'prod-far');

    expect(nearProd).toBeDefined();
    expect(farProd).toBeDefined();

    // Verify distance and logistics difference:
    // Nashik -> Mumbai (~167 km) has much lower logistics than Darjeeling -> Mumbai (>2000 km)
    expect(nearProd!.roadDistanceKm).toBeLessThan(farProd!.roadDistanceKm);
    expect(nearProd!.logisticsCostPerQuintal).toBeLessThan(farProd!.logisticsCostPerQuintal);

    // Verify that despite prod-far having a cheaper list price (3000 vs 3200),
    // prod-near has a lower Total Landed Cost due to freight!
    expect(nearProd!.totalLandedCostPerQuintal).toBeLessThan(farProd!.totalLandedCostPerQuintal);
    expect(nearProd!.rankByLandedCost).toBe(1);
    expect(nearProd!.isEconomicallyRecommended).toBe(true);

    expect(result.calculationFormula).toContain('Total Landed Cost = Product Price + Applicable Logistics Cost');
  });

  it('should handle empty marketplace products gracefully with null recommendation', async () => {
    mockPrisma.product.findMany.mockResolvedValue([]);

    const result = await service.calculateLandedCosts({
      buyerDestination: {
        state: 'Maharashtra',
        city: 'Mumbai',
      },
    });

    expect(result).toBeDefined();
    expect(result.products.length).toBe(0);
    expect(result.recommendedProduct).toBeNull();
  });

  it('should fall back to default demo destination (Mumbai, Maharashtra) when no destination or registered address exists', async () => {
    mockPrisma.product.findMany.mockResolvedValue([]);

    const result = await service.calculateLandedCosts({
      buyerDestination: {},
    });

    expect(result.buyerDestination.source).toBe('DEFAULT_DEMO');
    expect(result.buyerDestination.city).toBe('Mumbai');
    expect(result.buyerDestination.state).toBe('Maharashtra');
  });

  it('should execute carrier rate card fallback when exact bulk lane is missing', async () => {
    mockPrisma.product.findMany.mockResolvedValue([
      {
        id: 'prod-fallback',
        name: 'Remote Crop Lot',
        price: 2500,
        unit: 'QUINTAL',
        state: 'Assam',
        district: 'Jorhat',
        category: { name: 'Spices' },
        seller: { businessName: 'Eastern Planter' },
        inventory: { availableQuantity: 50 },
      },
    ]);

    vi.spyOn(logisticsService, 'findBuyerBulkLane').mockReturnValue(null);
    const estimateSpy = vi.spyOn(logisticsService, 'estimateLogistics');

    const result = await service.calculateLandedCosts({
      buyerDestination: {
        state: 'Maharashtra',
        city: 'Mumbai',
      },
      quantityQuintals: 5,
    });

    expect(estimateSpy).toHaveBeenCalled();
    expect(result.products.length).toBe(1);
    expect(result.products[0].matchType).toBe('RATE_CARD_FALLBACK');
    expect(result.products[0].totalLandedCostPerQuintal).toBe(
      Math.round((result.products[0].productPricePerQuintal + result.products[0].logisticsCostPerQuintal) * 100) / 100,
    );
  });

  it('should use exact bulk lane as PRIMARY and NEVER invoke carrier rate card when exact lane exists', async () => {
    mockPrisma.product.findMany.mockResolvedValue([
      {
        id: 'prod-nashik',
        name: 'Nashik Onions',
        price: 2000,
        unit: 'QUINTAL',
        state: 'Maharashtra',
        district: 'Nashik',
        category: { name: 'Vegetables' },
        seller: { businessName: 'Nashik Farmer' },
        inventory: { availableQuantity: 50 },
      },
    ]);

    const estimateSpy = vi.spyOn(logisticsService, 'estimateLogistics');

    const result = await service.calculateLandedCosts({
      buyerDestination: {
        state: 'Maharashtra',
        city: 'Mumbai',
        district: 'Mumbai',
      },
      quantityQuintals: 10,
    });

    expect(result.products.length).toBe(1);
    expect(result.products[0].matchType).toBe('EXACT');
    // Exact lane exists in buyer_bulk_lanes.csv -> estimateLogistics must NEVER be invoked
    expect(estimateSpy).not.toHaveBeenCalled();
    expect(result.products[0].costBreakdown.freightPerQuintal).toBeGreaterThan(0);
  });
});

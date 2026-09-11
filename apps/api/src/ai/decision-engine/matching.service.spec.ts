import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MatchingService } from './matching.service.js';

describe('MatchingService', () => {
  let service: MatchingService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      buyerRequirement: {
        findMany: vi.fn(),
      },
      product: {
        findMany: vi.fn(),
      },
    };
    service = new MatchingService(mockPrisma);
  });

  it('should match farmer to compatible open buyer requirements with explainable scoring', async () => {
    mockPrisma.buyerRequirement.findMany.mockResolvedValue([
      {
        id: 'req-1',
        buyerId: 'buyer-1',
        commodity: 'Onion',
        requiredQuantity: 60,
        unit: 'QUINTAL',
        targetPrice: 2200,
        deliveryLocation: 'Nashik',
        deliveryLatitude: 19.997,
        deliveryLongitude: 73.789,
        maxDistanceKm: 200,
        status: 'OPEN',
        buyer: {
          businessName: 'Maharashtra Wholesale Traders',
          buyerType: 'BUSINESS',
          verificationStatus: 'VERIFIED',
          user: { id: 'u1', email: 'trader@mandi.org' },
        },
      },
      {
        id: 'req-2',
        buyerId: 'buyer-2',
        commodity: 'Potato', // Mismatch
        requiredQuantity: 100,
        unit: 'QUINTAL',
        targetPrice: 1500,
        deliveryLocation: 'Agra',
        status: 'OPEN',
        buyer: {
          businessName: 'Agra Cold Chain',
          buyerType: 'BUSINESS',
          verificationStatus: 'VERIFIED',
          user: { id: 'u2', email: 'agra@cold.org' },
        },
      },
    ]);

    const matches = await this_call(service, {
      commodity: 'Onion',
      quantity: 50,
      askingPrice: 2100,
      location: { city: 'Lasalgaon', latitude: 20.147, longitude: 74.226 },
      maxDistanceKm: 150,
    });

    expect(matches.length).toBe(1);
    const match = matches[0];
    expect(match.requirementId).toBe('req-1');
    expect(match.commodity).toBe('Onion');
    expect(match.matchScore).toBeGreaterThan(70);
    expect(match.scoreBreakdown.commodityCompatibility).toBe(25);
    expect(match.scoreBreakdown.quantityCompatibility).toBeGreaterThan(15);
    expect(match.scoreBreakdown.locationDistance).toBeGreaterThan(10);
    expect(match.reasons.length).toBeGreaterThanOrEqual(3);
    expect(match.reasons.some((r) => r.includes('Direct commodity match'))).toBe(true);
  });

  it('should match buyer to active in-stock seller products', async () => {
    mockPrisma.product.findMany.mockResolvedValue([
      {
        id: 'prod-1',
        name: 'Fresh Red Onion',
        price: 2150,
        unit: 'QUINTAL',
        location: 'Nashik',
        status: 'ACTIVE',
        sellerId: 'seller-1',
        seller: {
          businessName: 'Green Valley Farm',
          sellerType: 'FARMER',
          farmLocation: 'Nashik',
          verificationStatus: 'VERIFIED',
          user: { id: 'u3', email: 'farmer@farm.org' },
        },
        inventory: { availableQuantity: 80 },
        category: { name: 'Vegetables' },
        images: [{ url: 'https://images.unsplash.com/onion.jpg' }],
      },
    ]);

    const matches = await service.matchSellersForBuyer({
      commodity: 'Onion',
      requiredQuantity: 40,
      maxBudgetPerUnit: 2200,
      deliveryLocation: { city: 'Pune' },
      maxDistanceKm: 300,
    });

    expect(matches.length).toBe(1);
    const match = matches[0];
    expect(match.productId).toBe('prod-1');
    expect(match.availableQuantity).toBe(80);
    expect(match.matchScore).toBeGreaterThanOrEqual(65);
    expect(match.reasons.some((r) => r.includes('In-stock match'))).toBe(true);
  });
});

function this_call(service: MatchingService, dto: any) {
  return service.matchBuyersForFarmer(dto);
}

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SmartAllocationService } from './smart-allocation.service.js';
import { NetRealizationService } from './net-realization.service.js';

describe('SmartAllocationService', () => {
  let service: SmartAllocationService;
  let netRealizationService: NetRealizationService;
  let mockMatchingService: any;
  let mockLogisticsService: any;
  let mockPrisma: any;

  beforeEach(() => {
    netRealizationService = new NetRealizationService();
    mockMatchingService = {
      matchBuyersForFarmer: vi.fn(),
    };
    mockLogisticsService = {
      estimateLogistics: vi.fn(),
    };
    mockPrisma = {
      aiPredictionLog: {
        create: vi.fn().mockResolvedValue({ id: 'log-1' }),
      },
    };

    service = new SmartAllocationService(
      netRealizationService,
      mockMatchingService,
      mockLogisticsService,
      mockPrisma,
    );
  });

  it('should rank options by net realization and explain why lower gross price can yield higher net realization (SIH Core Story)', async () => {
    // Mandi candidate: Pune (Distant, higher gross price ₹2,400, but high logistics ₹7,200)
    // Direct Buyer candidate: Local Buyer (Close, lower gross price ₹2,300, low logistics ₹1,800)
    mockLogisticsService.estimateLogistics.mockImplementation(async (payload: any) => {
      if (payload.destination.city === 'Pune') {
        return {
          distanceKm: 210,
          estimatedCost: 7200,
          perUnitCost: 144,
          estimatedDays: 1,
          isEstimated: true,
        };
      }
      // Local buyer
      return {
        distanceKm: 35,
        estimatedCost: 1800,
        perUnitCost: 36,
        estimatedDays: 1,
        isEstimated: true,
      };
    });

    mockMatchingService.matchBuyersForFarmer.mockResolvedValue([
      {
        requirementId: 'b-1',
        buyerName: 'Nashik Local Mart',
        targetPrice: 2300, // Lower than Pune Mandi ₹2,400
        deliveryLocation: 'Nashik MIDC',
        distanceKm: 35,
        matchScore: 92,
      },
    ]);

    const marketIntelligence = {
      markets: [
        {
          market: 'Pune',
          state: 'Maharashtra',
          modal_price: 2400, // Gross ₹2,400
          min_price: 2200,
          max_price: 2550,
          arrivals: 4200,
        },
      ],
      overall_stats: { avg_modal_price: 2350 },
    };

    const result = await service.optimizeAllocation(
      {
        commodity: 'Onion',
        quantity: 50, // 50 quintals
        sellerLocation: { city: 'Lasalgaon', state: 'Maharashtra' },
        maxTransitDistanceKm: 300,
        includeMandis: true,
        includeDirectBuyers: true,
        includePlatformListing: false,
      },
      marketIntelligence,
      'user-1',
    );

    expect(result.rankedOptions.length).toBeGreaterThanOrEqual(2);

    // Verify ranking
    const top = result.recommendedOption;
    expect(top.channelType).toBe('DIRECT_BUYER');
    expect(top.channelName).toContain('Nashik Local Mart');
    expect(top.expectedGrossPricePerUnit).toBe(2300);

    const second = result.rankedOptions[1];
    expect(second.channelName).toContain('Pune');
    expect(second.expectedGrossPricePerUnit).toBe(2400);

    // Verify that Net Realization of Top is greater than Second despite lower gross price!
    expect(top.estimatedNetRealization).toBeGreaterThan(second.estimatedNetRealization);

    // Verify explainable rationale specifically highlights the logistics saving and straight-line distance
    expect(result.recommendationRationale).toContain('HIGHER estimated net profit');
    expect(result.recommendationRationale).toContain('logistics savings');
    expect(result.recommendationRationale).toContain('straight-line distance');

    // Verify removal of escrow terminology
    expect(top.settlementTimeline).toBe('Direct Settlement upon Weighbridge Acceptance');
    expect(top.settlementTimeline).not.toContain('Escrow');
    expect(top.disadvantages.some((d) => d.includes('platform transaction fee'))).toBe(true);
    expect(top.disadvantages.some((d) => d.toLowerCase().includes('escrow'))).toBe(false);

    // Verify prediction log call
    expect(mockPrisma.aiPredictionLog.create).toHaveBeenCalled();
  });

  it('should eliminate channels exceeding hard transit distance constraints', async () => {
    mockLogisticsService.estimateLogistics.mockResolvedValue({
      distanceKm: 850, // Exceeds max 200 km
      estimatedCost: 25000,
      perUnitCost: 500,
      isEstimated: true,
    });

    const marketIntelligence = {
      markets: [
        {
          market: 'Agra',
          state: 'Uttar Pradesh',
          modal_price: 2800,
          arrivals: 3000,
        },
      ],
    };

    const result = await service.optimizeAllocation(
      {
        commodity: 'Potato',
        quantity: 50,
        sellerLocation: { city: 'Nashik', state: 'Maharashtra' },
        maxTransitDistanceKm: 200, // Hard limit 200 km
        includeMandis: true,
        includeDirectBuyers: false,
        includePlatformListing: false,
      },
      marketIntelligence,
    );

    expect(result.eliminatedCandidates.length).toBeGreaterThan(0);
    expect(result.eliminatedCandidates[0].reason).toContain('exceeds maximum transit limit');
  });

  it('should handle null/missing gross selling value and net realization safely without NaN in recommendationRationale', async () => {
    mockLogisticsService.estimateLogistics.mockResolvedValue({
      distanceKm: 25,
      estimatedCost: 1200,
      perUnitCost: 24,
      isEstimated: true,
    });

    // Market with 0 modal_price or missing price
    const marketIntelligence = {
      markets: [
        {
          market: 'Local Mandi',
          state: 'Maharashtra',
          modal_price: 0, // Spot auction without price anchor
          arrivals: 500,
        },
      ],
      overall_stats: { avg_modal_price: 0 },
    };

    const result = await service.optimizeAllocation(
      {
        commodity: 'Onion',
        quantity: 50,
        sellerLocation: { city: 'Nashik', state: 'Maharashtra' },
        includeMandis: true,
        includeDirectBuyers: false,
        includePlatformListing: true,
      },
      marketIntelligence,
    );

    expect(result.recommendationRationale).toBeDefined();
    expect(result.recommendationRationale).not.toMatch(/NaN/);
    expect(result.recommendationRationale).not.toMatch(/undefined/);
    expect(result.recommendationRationale).not.toMatch(/null/);
    expect(result.recommendationRationale).not.toMatch(/Infinity/);
    expect(result.recommendationRationale).not.toMatch(/₹NaN/);
  });
});

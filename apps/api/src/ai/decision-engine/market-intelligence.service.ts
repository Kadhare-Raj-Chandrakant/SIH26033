import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { LogisticsService } from '../../logistics/logistics.service.js';
import { LocationDto } from '../dto/smart-allocation.dto.js';

export interface MarketComparisonWithLogistics {
  market: string;
  district: string;
  state: string;
  minPrice: number;
  maxPrice: number;
  modalPrice: number;
  arrivals: number;
  tempMean: number | null;
  rainfall: number | null;
  humidity: number | null;
  predictedPrice: number | null;
  distanceKm?: number;
  estimatedLogisticsCostPerUnit?: number;
  estimatedNetAfterLogistics?: number;
}

export interface PlatformMarketSummary {
  activeListingsCount: number;
  minListingPrice: number | null;
  maxListingPrice: number | null;
  avgListingPrice: number | null;
  totalAvailableStock: number;
  unit: string;
}

export interface EnhancedMarketIntelligenceResult {
  commodity: string;
  reportingDate: string;
  totalMarketsReporting: number;
  overallStats: {
    minModalPrice: number;
    maxModalPrice: number;
    avgModalPrice: number;
    totalArrivalsTonnes: number;
    topPayingMarket: string;
    lowestPayingMarket: string;
  };
  markets: MarketComparisonWithLogistics[];
  platformMarket: PlatformMarketSummary;
  historicalTrend: Array<{ date: string; modal_price: number; arrivals: number }>;
  forwardOutlook: any;
  dataSourceDisclosures: {
    apmcMandi: string;
    platformMarketplace: string;
    wholesaleAbsorptionNotice: string;
  };
  limitations: string[];
  generatedAt: string;
}

@Injectable()
export class MarketIntelligenceService {
  private readonly logger = new Logger(MarketIntelligenceService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly logisticsService: LogisticsService,
  ) {}

  async getEnhancedMarketIntelligence(
    commodity: string,
    aiServiceMarketData: any,
    sellerLocation?: LocationDto,
  ): Promise<EnhancedMarketIntelligenceResult> {
    const cleanCommodity = commodity.trim();

    // 1. Query live platform products for this commodity
    const platformProducts = await this.prisma.product.findMany({
      where: {
        status: 'ACTIVE',
        OR: [
          { name: { contains: cleanCommodity, mode: 'insensitive' } },
          { category: { name: { contains: cleanCommodity, mode: 'insensitive' } } },
        ],
      },
      include: {
        inventory: true,
      },
    });

    let platformMin = null;
    let platformMax = null;
    let platformAvg = null;
    let totalStock = 0;

    if (platformProducts.length > 0) {
      const prices = platformProducts.map((p) => Number(p.price));
      platformMin = Math.min(...prices);
      platformMax = Math.max(...prices);
      platformAvg = Math.round((prices.reduce((a, b) => a + b, 0) / prices.length) * 100) / 100;
      totalStock = platformProducts.reduce(
        (acc, p) => acc + Number(p.inventory?.availableQuantity || 0),
        0,
      );
    }

    const platformMarketSummary: PlatformMarketSummary = {
      activeListingsCount: platformProducts.length,
      minListingPrice: platformMin,
      maxListingPrice: platformMax,
      avgListingPrice: platformAvg,
      totalAvailableStock: totalStock,
      unit: platformProducts[0]?.unit || 'QUINTAL',
    };

    // 2. Enhance APMC markets with distance and logistics if seller location is supplied
    const enhancedMarkets: MarketComparisonWithLogistics[] = [];
    const rawMarkets = aiServiceMarketData?.markets || [];

    for (const m of rawMarkets) {
      const item: MarketComparisonWithLogistics = {
        market: m.market,
        district: m.district,
        state: m.state,
        minPrice: m.min_price,
        maxPrice: m.max_price,
        modalPrice: m.modal_price,
        arrivals: m.arrivals,
        tempMean: m.temp_mean ?? null,
        rainfall: m.rainfall ?? null,
        humidity: m.humidity ?? null,
        predictedPrice: m.predicted_price ?? null,
      };

      if (sellerLocation && (sellerLocation.city || sellerLocation.latitude)) {
        try {
          const est = await this.logisticsService.estimateLogistics({
            origin: {
              city: sellerLocation.city,
              state: sellerLocation.state,
              pincode: sellerLocation.pincode,
              latitude: sellerLocation.latitude,
              longitude: sellerLocation.longitude,
            },
            destination: {
              city: m.market,
              state: m.state,
            },
            weightKg: 2500, // benchmark 25 quintals
            commodity: cleanCommodity,
          });
          item.distanceKm = est.distanceKm;
          item.estimatedLogisticsCostPerUnit = est.perUnitCost;
          item.estimatedNetAfterLogistics = Math.round((m.modal_price - est.perUnitCost) * 100) / 100;
        } catch {
          // Keep without logistics if estimation fails
        }
      }

      enhancedMarkets.push(item);
    }

    return {
      commodity: cleanCommodity,
      reportingDate: aiServiceMarketData?.reporting_date || new Date().toISOString().split('T')[0],
      totalMarketsReporting: enhancedMarkets.length,
      overallStats: {
        minModalPrice: aiServiceMarketData?.overall_stats?.min_modal_price || 0,
        maxModalPrice: aiServiceMarketData?.overall_stats?.max_modal_price || 0,
        avgModalPrice: aiServiceMarketData?.overall_stats?.avg_modal_price || 0,
        totalArrivalsTonnes: aiServiceMarketData?.overall_stats?.total_arrivals_tonnes || 0,
        topPayingMarket: aiServiceMarketData?.overall_stats?.top_paying_market || 'N/A',
        lowestPayingMarket: aiServiceMarketData?.overall_stats?.lowest_paying_market || 'N/A',
      },
      markets: enhancedMarkets,
      platformMarket: platformMarketSummary,
      historicalTrend: aiServiceMarketData?.historical_trend || [],
      forwardOutlook: aiServiceMarketData?.forward_outlook || null,
      dataSourceDisclosures: {
        apmcMandi: 'APMC Mandi Wholesale Benchmark (Synthetic Demo Baseline)',
        platformMarketplace: 'Live SIH26033 Platform Marketplace Catalog (Real Database)',
        wholesaleAbsorptionNotice:
          'Arrival volumes represent wholesale market absorption proxy in tonnes, NOT unmet platform consumer demand.',
      },
      limitations: [
        'Inter-market price differentials do not guarantee arbitrage profit due to transit perishability and freight.',
        'Mandi prices reflect APMC wholesale auctions and omit local farm-gate sorting/packaging deductions.',
        'Distance metrics represent estimated straight-line (geodesic/Haversine) geographic distance, not actual driving road network distance.',
        'Net after freight figures are based on benchmark tariffs on geographic distance and do not constitute binding carrier quotes.',
      ],
      generatedAt: new Date().toISOString(),
    };
  }
}

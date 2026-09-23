import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { LogisticsService } from '../../logistics/logistics.service.js';

export interface EvaluatedLandedCostProduct {
  productId: string;
  productName: string;
  category: string;
  varietyType?: string;
  farmerName?: string;
  farmName?: string;
  sellerBusinessName?: string;
  primaryImage?: string;
  originState: string;
  originDistrict: string;
  originLocationDisplay: string;
  availableQuantity: number;
  unit: string;
  roadDistanceKm: number;
  productPricePerQuintal: number;
  logisticsCostPerQuintal: number;
  totalLandedCostPerQuintal: number;
  totalLandedOrderCost: number;
  costBreakdown: {
    freightPerQuintal: number;
    fixedChargePerQuintal: number;
    handlingPerQuintal: number;
    loadingPerQuintal: number;
    insurancePerQuintal: number;
  };
  rankByLandedCost: number;
  rankByListPrice: number;
  isEconomicallyRecommended: boolean;
  economicNote: string;
  laneType?: string;
  matchType?: string;
}

export interface MarketplaceLandedCostResult {
  buyerDestination: {
    state: string;
    city?: string;
    district?: string;
    source: string;
  };
  orderQuantityQuintals: number;
  products: EvaluatedLandedCostProduct[];
  recommendedProduct: EvaluatedLandedCostProduct | null;
  calculationFormula: string;
  summaryExplanation: string;
  generatedAt: string;
}

@Injectable()
export class MarketplaceLandedCostService {
  private readonly logger = new Logger(MarketplaceLandedCostService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly logisticsService: LogisticsService,
  ) {}

  async calculateLandedCosts(params: {
    buyerDestination: {
      state?: string;
      city?: string;
      district?: string;
    };
    userId?: string;
    productIds?: string[];
    commodity?: string;
    quantityQuintals?: number;
  }): Promise<MarketplaceLandedCostResult> {
    const qty = Math.max(0.1, params.quantityQuintals || 10);

    // 1. Resolve Buyer Delivery Location
    let destState = params.buyerDestination?.state?.trim() || '';
    let destCity = params.buyerDestination?.city?.trim() || '';
    let destDistrict = params.buyerDestination?.district?.trim() || destCity;
    let source = 'EXPLICIT_PARAMETER';

    if ((!destState || !destCity) && params.userId) {
      const user = await this.prisma.user.findUnique({
        where: { id: params.userId },
        include: {
          addresses: { orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }] },
        },
      });

      if (user?.addresses && user.addresses.length > 0) {
        const addr = user.addresses[0];
        destState = destState || addr.state;
        destCity = destCity || addr.city;
        destDistrict = destDistrict || addr.district || addr.city;
        source = 'REGISTERED_ADDRESS';
      }
    }

    if (!destState) {
      destState = 'Maharashtra';
      destCity = destCity || 'Mumbai';
      destDistrict = destDistrict || 'Mumbai';
      source = 'DEFAULT_DEMO';
    }

    // 2. Query Candidate Marketplace Products
    const whereClause: any = {
      status: 'ACTIVE',
    };

    if (params.productIds && params.productIds.length > 0) {
      whereClause.id = { in: params.productIds };
    }

    if (params.commodity && params.commodity.trim()) {
      const comm = params.commodity.trim();
      whereClause.OR = [
        { name: { contains: comm, mode: 'insensitive' } },
        { category: { name: { contains: comm, mode: 'insensitive' } } },
      ];
    }

    const products = await this.prisma.product.findMany({
      where: whereClause,
      include: {
        category: true,
        seller: true,
        inventory: true,
      },
      take: 30,
    });

    // 3. Evaluate each product's landed cost
    const evaluatedProducts: EvaluatedLandedCostProduct[] = [];

    for (const prod of products) {
      const originState = prod.state || 'Maharashtra';
      const originDistrict = prod.district || 'Nashik';

      // Price per quintal (convert KG if needed)
      let pricePerQuintal = Number(prod.illustrativeFarmerListingReferenceInr || prod.price);
      if (prod.unit === 'KG') {
        pricePerQuintal = pricePerQuintal * 100;
      }

      // Check exact buyer bulk lane
      const lane = this.logisticsService.findBuyerBulkLane(
        originState,
        originDistrict,
        destState,
        destCity,
        destDistrict,
      );

      let roadDistanceKm = 0;
      let freightPerQuintal = 0;
      let fixedChargePerQuintal = 0;
      let loadingPerQuintal = 0;
      let handlingPerQuintal = 0;
      let insurancePerQuintal = 0;
      let laneType = 'STANDARD';
      let matchType = 'EXACT';

      if (lane) {
        roadDistanceKm = lane.roadDistanceKm;
        freightPerQuintal = lane.freightInrPerQuintal;
        fixedChargePerQuintal = Math.round((lane.fixedLaneChargeInr / qty) * 100) / 100;
        loadingPerQuintal = lane.loadingInrPerQuintal;
        handlingPerQuintal = lane.handlingInrPerQuintal;
        insurancePerQuintal = lane.insuranceInrPerQuintal;
        laneType = lane.laneType;
        matchType =
          this.normalize(lane.destinationCity) === this.normalize(destCity) ? 'EXACT' : 'NORMALIZED';
      } else {
        // Fallback via Logistics Provider
        const est = await this.logisticsService.estimateLogistics({
          origin: { state: originState, district: originDistrict },
          destination: { state: destState, city: destCity, district: destDistrict },
          weightKg: qty * 100,
          quantityQuintals: qty,
        });
        roadDistanceKm = est.distanceKm;
        freightPerQuintal = est.costBreakdown.distanceFare / qty;
        fixedChargePerQuintal = Math.round(((est.costBreakdown.fixedLaneCharge || 600) / qty) * 100) / 100;
        loadingPerQuintal = (est.costBreakdown.loading || 0) / qty;
        handlingPerQuintal = (est.costBreakdown.handling || 0) / qty;
        insurancePerQuintal = (est.costBreakdown.insurance || 0) / qty;
        matchType = 'RATE_CARD_FALLBACK';
      }

      const totalLogisticsCostPerQuintal =
        Math.round(
          (freightPerQuintal + fixedChargePerQuintal + loadingPerQuintal + handlingPerQuintal + insurancePerQuintal) *
            100,
        ) / 100;

      const totalLandedCostPerQuintal =
        Math.round((pricePerQuintal + totalLogisticsCostPerQuintal) * 100) / 100;
      const totalLandedOrderCost = Math.round(totalLandedCostPerQuintal * qty * 100) / 100;

      evaluatedProducts.push({
        productId: prod.id,
        productName: prod.name,
        category: prod.category.name,
        varietyType: prod.varietyType || undefined,
        farmerName: prod.farmerName || undefined,
        farmName: prod.farmName || undefined,
        sellerBusinessName: prod.seller.businessName || undefined,
        primaryImage: prod.primaryImage || undefined,
        originState,
        originDistrict,
        originLocationDisplay: `${originDistrict}, ${originState}`,
        availableQuantity: Number(prod.inventory?.availableQuantity || 0),
        unit: prod.unit,
        roadDistanceKm,
        productPricePerQuintal: pricePerQuintal,
        logisticsCostPerQuintal: totalLogisticsCostPerQuintal,
        totalLandedCostPerQuintal,
        totalLandedOrderCost,
        costBreakdown: {
          freightPerQuintal,
          fixedChargePerQuintal,
          handlingPerQuintal,
          loadingPerQuintal,
          insurancePerQuintal,
        },
        rankByLandedCost: 0,
        rankByListPrice: 0,
        isEconomicallyRecommended: false,
        economicNote: '',
        laneType,
        matchType,
      });
    }

    // 4. Rank by List Price vs Landed Cost to expose anomalies
    evaluatedProducts.sort((a, b) => a.productPricePerQuintal - b.productPricePerQuintal);
    evaluatedProducts.forEach((p, idx) => {
      p.rankByListPrice = idx + 1;
    });

    // Rank by Total Landed Cost (Primary Criterion)
    evaluatedProducts.sort((a, b) => a.totalLandedCostPerQuintal - b.totalLandedCostPerQuintal);
    evaluatedProducts.forEach((p, idx) => {
      p.rankByLandedCost = idx + 1;
      p.isEconomicallyRecommended = idx === 0;

      if (p.isEconomicallyRecommended) {
        p.economicNote = `Economically optimal: Lowest total delivered landed cost (₹${p.totalLandedCostPerQuintal}/Q) to ${destCity}.`;
      } else if (p.rankByListPrice < p.rankByLandedCost) {
        p.economicNote = `Lower list price (₹${p.productPricePerQuintal}/Q) is wiped out by ₹${p.logisticsCostPerQuintal}/Q freight over ${p.roadDistanceKm} km.`;
      } else {
        p.economicNote = `Standard delivery corridor (${p.roadDistanceKm} km); ₹${p.logisticsCostPerQuintal}/Q logistics applies.`;
      }
    });

    const recommended = evaluatedProducts.find((p) => p.isEconomicallyRecommended) || evaluatedProducts[0] || null;

    let summary = '';
    if (recommended) {
      summary = `Delivering to ${destCity}, ${destState}: ${recommended.productName} from ${recommended.originLocationDisplay} achieves the lowest total landed cost of ₹${recommended.totalLandedCostPerQuintal}/quintal (₹${recommended.productPricePerQuintal} product + ₹${recommended.logisticsCostPerQuintal} logistics).`;
    }

    return {
      buyerDestination: {
        state: destState,
        city: destCity,
        district: destDistrict,
        source,
      },
      orderQuantityQuintals: qty,
      products: evaluatedProducts,
      recommendedProduct: recommended,
      calculationFormula: 'Total Landed Cost = Product Price + Applicable Logistics Cost',
      summaryExplanation: summary,
      generatedAt: new Date().toISOString(),
    };
  }

  private normalize(val?: string): string {
    return (val || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  }
}

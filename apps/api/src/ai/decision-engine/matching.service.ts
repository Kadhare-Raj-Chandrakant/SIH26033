import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { LogisticsService } from '../../logistics/logistics.service.js';
import { MockLogisticsProvider } from '../../logistics/providers/mock-logistics.provider.js';
import { MatchBuyersDto } from '../dto/match-buyers.dto.js';
import { MatchSellersDto } from '../dto/match-sellers.dto.js';
import { LocationDto } from '../dto/smart-allocation.dto.js';

export interface BuyerMatchItem {
  requirementId: string;
  buyerId: string;
  buyerName: string;
  businessName: string | null;
  buyerType: string;
  commodity: string;
  requiredQuantity: number;
  unit: string;
  targetPrice: number | null;
  deliveryLocation: string | null;
  distanceKm: number;
  matchScore: number;
  scoreBreakdown: {
    commodityCompatibility: number;
    quantityCompatibility: number;
    locationDistance: number;
    priceCompatibility: number;
    fulfillmentFeasibility: number;
  };
  reasons: string[];
}

export interface SellerMatchItem {
  productId: string;
  productName: string;
  sellerId: string;
  sellerName: string;
  businessName: string | null;
  sellerType: string;
  verificationStatus: string;
  availableQuantity: number;
  unit: string;
  unitPrice: number;
  location: string | null;
  distanceKm: number;
  matchScore: number;
  scoreBreakdown: {
    quantityFulfillment: number;
    priceCompetitiveness: number;
    distanceLogistics: number;
    sellerReliability: number;
  };
  reasons: string[];
  imageUrl: string | null;
}

@Injectable()
export class MatchingService {
  private readonly defaultLogistics = new MockLogisticsProvider();

  constructor(
    private readonly prisma: PrismaService,
    private readonly logisticsService?: LogisticsService,
  ) {}

  /**
   * Farmer-Side Matching: Finds relevant buyers and open buyer sourcing requirements
   */
  async matchBuyersForFarmer(dto: MatchBuyersDto): Promise<BuyerMatchItem[]> {
    const targetCommodity = dto.commodity.trim().toLowerCase();
    const maxDistance = dto.maxDistanceKm || 350;
    const limit = Math.min(Math.max(1, dto.limit || 10), 50);

    // 1. Fetch open buyer requirements from database
    const openRequirements = await this.prisma.buyerRequirement.findMany({
      where: { status: 'OPEN' },
      include: {
        buyer: {
          include: {
            user: {
              select: { id: true, email: true },
            },
          },
        },
      },
    });

    const matches: BuyerMatchItem[] = [];

    for (const req of openRequirements) {
      // Hard Constraint 1: Commodity compatibility
      if (req.commodity.trim().toLowerCase() !== targetCommodity) {
        continue;
      }

      // Calculate distance
      const distanceKm = this.calculateDistance(
        dto.location,
        {
          city: req.deliveryLocation || undefined,
          latitude: req.deliveryLatitude ?? undefined,
          longitude: req.deliveryLongitude ?? undefined,
        },
      );

      // Hard Constraint 2: Maximum fulfillment distance
      const buyerMaxDist = req.maxDistanceKm || 500;
      if (distanceKm > maxDistance || distanceKm > buyerMaxDist) {
        continue;
      }

      const reqQty = Number(req.requiredQuantity);
      const askingPrice = dto.askingPrice || 0;
      const targetPrice = req.targetPrice ? Number(req.targetPrice) : null;

      // Soft Scoring (0 - 100)
      // Factor 1: Commodity Match (25 pts)
      const commScore = 25;

      // Factor 2: Quantity Compatibility (25 pts)
      const qtyRatio = Math.min(dto.quantity, reqQty) / Math.max(dto.quantity, reqQty);
      const qtyScore = Math.round(qtyRatio * 25);

      // Factor 3: Location & Distance (25 pts)
      let distScore = 5;
      if (distanceKm <= 30) distScore = 25;
      else if (distanceKm <= 75) distScore = 21;
      else if (distanceKm <= 150) distScore = 16;
      else if (distanceKm <= 300) distScore = 11;

      // Factor 4: Price Overlap (15 pts)
      let priceScore = 10;
      if (targetPrice && askingPrice > 0) {
        if (targetPrice >= askingPrice) {
          priceScore = 15;
        } else {
          const diffPct = (askingPrice - targetPrice) / targetPrice;
          priceScore = Math.max(0, Math.round((1 - Math.min(1, diffPct * 2)) * 15));
        }
      }

      // Factor 5: Buyer Reliability & Feasibility (10 pts)
      const isVerified = req.buyer.verificationStatus === 'VERIFIED';
      const feasibilityScore = (isVerified ? 6 : 4) + 4; // base 4 + verified 2 + delivery feasibility 4

      const totalScore = Math.min(100, commScore + qtyScore + distScore + priceScore + feasibilityScore);

      // Explainable Human-Readable Reasons
      const reasons: string[] = [
        `Direct commodity match: ${req.commodity}`,
        `Quantity alignment: Buyer seeks ${reqQty} ${req.unit} (${Math.round(qtyRatio * 100)}% volume compatibility).`,
        `Estimated distance: approximately ${distanceKm} km (straight-line geographic estimate within regional radius).`,
      ];

      if (targetPrice) {
        if (targetPrice >= askingPrice && askingPrice > 0) {
          reasons.push(`Price compatible: Buyer budget ₹${targetPrice}/q covers your asking price of ₹${askingPrice}/q.`);
        } else if (askingPrice > 0) {
          reasons.push(`Price negotiable: Buyer ceiling ₹${targetPrice}/q vs your ask of ₹${askingPrice}/q.`);
        }
      } else {
        reasons.push('Buyer open to market competitive spot quotations.');
      }

      if (isVerified) {
        reasons.push('Verified platform buyer with trade credibility.');
      }

      matches.push({
        requirementId: req.id,
        buyerId: req.buyerId,
        buyerName: req.buyer.businessName || req.buyer.user.email.split('@')[0],
        businessName: req.buyer.businessName,
        buyerType: req.buyer.buyerType,
        commodity: req.commodity,
        requiredQuantity: reqQty,
        unit: req.unit,
        targetPrice,
        deliveryLocation: req.deliveryLocation,
        distanceKm,
        matchScore: totalScore,
        scoreBreakdown: {
          commodityCompatibility: commScore,
          quantityCompatibility: qtyScore,
          locationDistance: distScore,
          priceCompatibility: priceScore,
          fulfillmentFeasibility: feasibilityScore,
        },
        reasons,
      });
    }

    // Sort descending by score and take limit
    return matches.sort((a, b) => b.matchScore - a.matchScore).slice(0, limit);
  }

  /**
   * Buyer-Side Matching: Finds matching products & verified sellers for a buyer requirement
   */
  async matchSellersForBuyer(dto: MatchSellersDto): Promise<SellerMatchItem[]> {
    const targetCommodity = dto.commodity.trim().toLowerCase();
    const maxDistance = dto.maxDistanceKm || 350;
    const limit = Math.min(Math.max(1, dto.limit || 10), 50);

    // Fetch active products with inventory
    const products = await this.prisma.product.findMany({
      where: {
        status: 'ACTIVE',
        inventory: {
          availableQuantity: { gt: 0 },
        },
      },
      include: {
        seller: {
          include: {
            user: {
              select: { id: true, email: true },
            },
          },
        },
        inventory: true,
        category: true,
        images: {
          where: { isPrimary: true },
          take: 1,
        },
      },
    });

    const matches: SellerMatchItem[] = [];

    for (const prod of products) {
      // Hard Constraint 1: Commodity name / category check
      const nameMatch = prod.name.toLowerCase().includes(targetCommodity);
      const catMatch = prod.category.name.toLowerCase().includes(targetCommodity);
      if (!nameMatch && !catMatch) {
        continue;
      }

      // Hard Constraint 2: Inventory availability
      const availQty = Number(prod.inventory?.availableQuantity || 0);
      if (availQty <= 0) {
        continue;
      }

      // Distance
      const distanceKm = this.calculateDistance(
        dto.deliveryLocation,
        {
          city: prod.location || prod.seller.farmLocation || undefined,
        },
      );

      // Hard Constraint 3: Distance boundary
      if (distanceKm > maxDistance) {
        continue;
      }

      const unitPrice = Number(prod.price);
      const budget = dto.maxBudgetPerUnit;

      // Soft Scoring (0 - 100)
      // Factor 1: Quantity Fulfillment (25 pts)
      const qtyRatio = Math.min(availQty, dto.requiredQuantity) / Math.max(availQty, dto.requiredQuantity);
      const qtyScore = Math.round(qtyRatio * 25);

      // Factor 2: Price Competitiveness (25 pts)
      let priceScore = 18;
      if (budget && budget > 0) {
        if (unitPrice <= budget) {
          const savings = (budget - unitPrice) / budget;
          priceScore = Math.min(25, 20 + Math.round(savings * 25));
        } else {
          const over = (unitPrice - budget) / budget;
          priceScore = Math.max(0, Math.round((1 - over * 2) * 20));
        }
      }

      // Factor 3: Distance & Logistics (25 pts)
      let distScore = 5;
      if (distanceKm <= 30) distScore = 25;
      else if (distanceKm <= 75) distScore = 20;
      else if (distanceKm <= 150) distScore = 15;
      else if (distanceKm <= 300) distScore = 10;

      // Factor 4: Seller Reliability (25 pts)
      const isVerified = prod.seller.verificationStatus === 'VERIFIED';
      const sellerScore = isVerified ? 25 : 18;

      const totalScore = Math.min(100, qtyScore + priceScore + distScore + sellerScore);

      const reasons: string[] = [
        `In-stock match: ${prod.name} (${availQty} ${prod.unit} available).`,
        `Proximity: Estimated ${distanceKm} km geographic straight-line distance (${prod.location || 'Local Regional Hub'}).`,
      ];

      if (budget) {
        if (unitPrice <= budget) {
          reasons.push(`Budget favorable: Listed at ₹${unitPrice}/${prod.unit} (under your budget of ₹${budget}).`);
        } else {
          reasons.push(`Listed at ₹${unitPrice}/${prod.unit} vs budget of ₹${budget}.`);
        }
      } else {
        reasons.push(`Competitive unit price of ₹${unitPrice}/${prod.unit}.`);
      }

      if (isVerified) {
        reasons.push('Direct verified seller with verified farm location.');
      }

      matches.push({
        productId: prod.id,
        productName: prod.name,
        sellerId: prod.sellerId,
        sellerName: prod.seller.businessName || prod.seller.user.email.split('@')[0],
        businessName: prod.seller.businessName,
        sellerType: prod.seller.sellerType,
        verificationStatus: prod.seller.verificationStatus,
        availableQuantity: availQty,
        unit: prod.unit,
        unitPrice,
        location: prod.location || prod.seller.farmLocation,
        distanceKm,
        matchScore: totalScore,
        scoreBreakdown: {
          quantityFulfillment: qtyScore,
          priceCompetitiveness: priceScore,
          distanceLogistics: distScore,
          sellerReliability: sellerScore,
        },
        reasons,
        imageUrl: prod.primaryImage || prod.images[0]?.url || null,
      });
    }

    return matches.sort((a, b) => b.matchScore - a.matchScore).slice(0, limit);
  }

  private calculateDistance(origin: LocationDto, dest: LocationDto): number {
    return this.defaultLogistics.calculateDistance(origin, dest);
  }
}

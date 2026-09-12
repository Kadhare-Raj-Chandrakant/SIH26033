import { Injectable, Logger } from '@nestjs/common';
import { SmartAllocationDto } from '../dto/smart-allocation.dto.js';
import { NetRealizationService } from './net-realization.service.js';
import { MatchingService } from './matching.service.js';
import { LogisticsService } from '../../logistics/logistics.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';

export interface AllocationOption {
  rank: number;
  channelType: 'MANDI' | 'DIRECT_BUYER' | 'PLATFORM_LISTING';
  channelName: string;
  destinationLocation: string;
  distanceKm: number;
  expectedGrossPricePerUnit: number;
  grossSellingValue: number;
  logisticsCost: number;
  handlingCost: number;
  platformOrMandiFee: number;
  totalDeductions: number;
  estimatedNetRealization: number;
  perUnitNetRealization: number;
  marketActivityProxy: string;
  settlementTimeline: string;
  advantages: string[];
  disadvantages: string[];
}

export interface EliminationLog {
  candidateName: string;
  channelType: string;
  reason: string;
}

export interface SmartAllocationResult {
  commodity: string;
  quantity: number;
  unit: string;
  sellerOrigin: string;
  rankedOptions: AllocationOption[];
  recommendedOption: AllocationOption;
  recommendationRationale: string;
  eliminatedCandidates: EliminationLog[];
  settlementDistinctionNotice: string;
  generatedAt: string;
}

@Injectable()
export class SmartAllocationService {
  private readonly logger = new Logger(SmartAllocationService.name);

  constructor(
    private readonly netRealizationService: NetRealizationService,
    private readonly matchingService: MatchingService,
    private readonly logisticsService: LogisticsService,
    private readonly prisma: PrismaService,
  ) {}

  async optimizeAllocation(
    dto: SmartAllocationDto,
    marketIntelligence?: any,
    userId?: string,
  ): Promise<SmartAllocationResult> {
    const qty = dto.quantity;
    const unit = dto.unit || 'QUINTAL';
    const maxDist = dto.maxTransitDistanceKm || 450;
    const minPrice = dto.minAcceptablePrice || 0;

    const candidateOptions: AllocationOption[] = [];
    const eliminated: EliminationLog[] = [];

    // 1. Process APMC Mandi Channels
    if (dto.includeMandis !== false && marketIntelligence?.markets) {
      for (const mkt of marketIntelligence.markets) {
        // Distance check
        let logisticsEst;
        try {
          logisticsEst = await this.logisticsService.estimateLogistics({
            origin: {
              city: dto.sellerLocation.city,
              state: dto.sellerLocation.state,
              pincode: dto.sellerLocation.pincode,
              latitude: dto.sellerLocation.latitude,
              longitude: dto.sellerLocation.longitude,
            },
            destination: {
              city: mkt.market,
              state: mkt.state,
            },
            weightKg: qty * 100, // Quintals to KG
            commodity: dto.commodity,
          });
        } catch {
          logisticsEst = {
            distanceKm: 120,
            estimatedCost: 3500,
            estimatedDays: 1,
            isEstimated: true,
          };
        }

        const distKm = logisticsEst.distanceKm;

        // Hard Constraint: Distance boundary
        if (distKm > maxDist) {
          eliminated.push({
            candidateName: `${mkt.market} APMC`,
            channelType: 'MANDI',
            reason: `Distance (${distKm} km) exceeds maximum transit limit of ${maxDist} km.`,
          });
          continue;
        }

        const grossPrice = mkt.modal_price;

        // Hard Constraint: Minimum acceptable price
        if (minPrice > 0 && grossPrice < minPrice) {
          eliminated.push({
            candidateName: `${mkt.market} APMC`,
            channelType: 'MANDI',
            reason: `Modal price (₹${grossPrice}/q) is below your minimum threshold of ₹${minPrice}/q.`,
          });
          continue;
        }

        // Calculate Net Realization
        const netCalc = this.netRealizationService.calculate({
          quantity: qty,
          unit,
          grossPricePerUnit: grossPrice,
          destinationName: `${mkt.market} APMC`,
          logisticsCost: logisticsEst.estimatedCost,
          distanceKm: distKm,
          mandiCessPercent: 1.0, // Standard APMC cess
          platformFeeRatePercent: 0, // No platform fee on physical mandi
          handlingCostPerUnit: 16,
          packagingCostPerUnit: 14,
        });

        const handlingFee = netCalc.deductions.find((d) => d.category === 'HANDLING')?.amount || 0;
        const taxFee = netCalc.deductions.find((d) => d.category === 'TAX')?.amount || 0;

        candidateOptions.push({
          rank: 0,
          channelType: 'MANDI',
          channelName: `${mkt.market} APMC Mandi`,
          destinationLocation: `${mkt.market}, ${mkt.state}`,
          distanceKm: distKm,
          expectedGrossPricePerUnit: grossPrice,
          grossSellingValue: netCalc.grossSellingValue,
          logisticsCost: logisticsEst.estimatedCost,
          handlingCost: handlingFee,
          platformOrMandiFee: taxFee,
          totalDeductions: netCalc.totalDeductions,
          estimatedNetRealization: netCalc.estimatedNetRealization,
          perUnitNetRealization: netCalc.perUnitNetRealization,
          marketActivityProxy: mkt.arrivals > 3500 ? 'HIGH' : mkt.arrivals > 1500 ? 'MODERATE' : 'LOW',
          settlementTimeline: 'T+1 Physical Auction Payout',
          advantages: [
            `High liquidity wholesale auction (${mkt.arrivals} tonnes daily absorption).`,
            'Same-day consignment unloading at physical mandi yard.',
          ],
          disadvantages: [
            '1.0% APMC market cess and handling charges apply.',
            'Auction spot price volatility on arrival day.',
          ],
        });
      }
    }

    // 2. Process Direct Buyer Channels
    if (dto.includeDirectBuyers !== false) {
      try {
        const buyerMatches = await this.matchingService.matchBuyersForFarmer({
          commodity: dto.commodity,
          quantity: qty,
          location: dto.sellerLocation,
          maxDistanceKm: maxDist,
          limit: 5,
        });

        for (const buyer of buyerMatches) {
          const buyerTargetPrice = buyer.targetPrice || (marketIntelligence?.overall_stats?.avg_modal_price || 2300);

          if (minPrice > 0 && buyerTargetPrice < minPrice) {
            eliminated.push({
              candidateName: buyer.buyerName,
              channelType: 'DIRECT_BUYER',
              reason: `Buyer budget (₹${buyerTargetPrice}/q) is below minimum acceptable price ₹${minPrice}/q.`,
            });
            continue;
          }

          let buyerLogistics;
          try {
            buyerLogistics = await this.logisticsService.estimateLogistics({
              origin: {
                city: dto.sellerLocation.city,
                state: dto.sellerLocation.state,
                pincode: dto.sellerLocation.pincode,
                latitude: dto.sellerLocation.latitude,
                longitude: dto.sellerLocation.longitude,
              },
              destination: {
                city: buyer.deliveryLocation || dto.sellerLocation.city,
              },
              weightKg: qty * 100,
              commodity: dto.commodity,
            });
          } catch {
            buyerLogistics = {
              distanceKm: buyer.distanceKm,
              estimatedCost: Math.round(400 + buyer.distanceKm * (qty * 0.1) * 3.5 * 1.1),
              estimatedDays: 1,
              isEstimated: true,
            };
          }

          const netCalc = this.netRealizationService.calculate({
            quantity: qty,
            unit,
            grossPricePerUnit: buyerTargetPrice,
            destinationName: `Buyer: ${buyer.buyerName}`,
            logisticsCost: buyerLogistics.estimatedCost,
            distanceKm: buyer.distanceKm,
            platformFeeRatePercent: 1.5,
            mandiCessPercent: 0, // Direct trade exempt from mandi cess
            handlingCostPerUnit: 10,
            packagingCostPerUnit: 12,
          });

          const handlingFee = netCalc.deductions.find((d) => d.category === 'HANDLING')?.amount || 0;
          const platFee = netCalc.deductions.find((d) => d.category === 'FEES')?.amount || 0;

          candidateOptions.push({
            rank: 0,
            channelType: 'DIRECT_BUYER',
            channelName: `Direct Buyer: ${buyer.buyerName}`,
            destinationLocation: buyer.deliveryLocation || 'Buyer Warehouse',
            distanceKm: buyer.distanceKm,
            expectedGrossPricePerUnit: buyerTargetPrice,
            grossSellingValue: netCalc.grossSellingValue,
            logisticsCost: buyerLogistics.estimatedCost,
            handlingCost: handlingFee,
            platformOrMandiFee: platFee,
            totalDeductions: netCalc.totalDeductions,
            estimatedNetRealization: netCalc.estimatedNetRealization,
            perUnitNetRealization: netCalc.perUnitNetRealization,
            marketActivityProxy: 'COMMITTED_DEMAND',
            settlementTimeline: 'Direct Settlement upon Weighbridge Acceptance',
            advantages: [
              'Zero APMC market committee cess.',
              'Guaranteed contractual price commitment with verified buyer.',
              buyer.distanceKm < 60 ? 'Close geographic proximity minimizes transit shrinkage.' : 'Bulk trade quantity match.',
            ],
            disadvantages: [
              '1.5% platform transaction fee.',
              'Payment contingent upon physical acceptance inspection.',
            ],
          });
        }
      } catch (err: any) {
        this.logger.warn(`Failed to gather direct buyer candidates: ${err.message}`);
      }
    }

    // 3. Process Platform Marketplace Listing Option
    if (dto.includePlatformListing !== false) {
      const avgPrice = marketIntelligence?.overall_stats?.avg_modal_price || 2350;
      const platformPrice = Math.round(avgPrice * 1.03 * 100) / 100; // 3% premium on digital marketplace

      const netCalc = this.netRealizationService.calculate({
        quantity: qty,
        unit,
        grossPricePerUnit: platformPrice,
        destinationName: 'Direct Platform Listing',
        logisticsCost: Math.round(400 + 40 * (qty * 0.1) * 3.5 * 1.1),
        distanceKm: 40,
        platformFeeRatePercent: 1.5,
        mandiCessPercent: 0,
        handlingCostPerUnit: 10,
        packagingCostPerUnit: 12,
      });

      const handlingFee = netCalc.deductions.find((d) => d.category === 'HANDLING')?.amount || 0;
      const platFee = netCalc.deductions.find((d) => d.category === 'FEES')?.amount || 0;

      candidateOptions.push({
        rank: 0,
        channelType: 'PLATFORM_LISTING',
        channelName: 'Marketplace Listing (Direct-to-Buyer)',
        destinationLocation: 'Farm-gate / Local Logistics Pickup',
        distanceKm: 40,
        expectedGrossPricePerUnit: platformPrice,
        grossSellingValue: netCalc.grossSellingValue,
        logisticsCost: 1500,
        handlingCost: handlingFee,
        platformOrMandiFee: platFee,
        totalDeductions: netCalc.totalDeductions,
        estimatedNetRealization: netCalc.estimatedNetRealization,
        perUnitNetRealization: netCalc.perUnitNetRealization,
        marketActivityProxy: 'PLATFORM_POOL',
        settlementTimeline: 'Instant digital payout post-delivery',
        advantages: [
          'Full control over pricing with platform premium potential.',
          'Buyer pays primary freight on catalog orders.',
        ],
        disadvantages: [
          'Liquidation speed depends on platform buyer discovery.',
        ],
      });
    }

    // Fallback if no candidate was viable
    if (candidateOptions.length === 0) {
      const baselinePrice = minPrice > 0 ? minPrice : 2200;
      const netFallback = this.netRealizationService.calculate({
        quantity: qty,
        unit,
        grossPricePerUnit: baselinePrice,
        destinationName: 'Local APMC Default',
        distanceKm: 30,
        mandiCessPercent: 1.0,
      });

      candidateOptions.push({
        rank: 1,
        channelType: 'MANDI',
        channelName: 'Local Regional Mandi (Default Benchmark)',
        destinationLocation: dto.sellerLocation.city || 'Regional Center',
        distanceKm: 30,
        expectedGrossPricePerUnit: baselinePrice,
        grossSellingValue: netFallback.grossSellingValue,
        logisticsCost: netFallback.deductions[0].amount,
        handlingCost: 500,
        platformOrMandiFee: 200,
        totalDeductions: netFallback.totalDeductions,
        estimatedNetRealization: netFallback.estimatedNetRealization,
        perUnitNetRealization: netFallback.perUnitNetRealization,
        marketActivityProxy: 'MODERATE',
        settlementTimeline: 'T+1 Auction Settlement',
        advantages: ['Local accessibility with minimal transit risk.'],
        disadvantages: ['Subject to daily auction price variance.'],
      });
    }

    // Helper to safely verify valid finite numbers
    const isValidNum = (val: unknown): val is number =>
      typeof val === 'number' && Number.isFinite(val);

    // Sort descending by estimated net realization (nulls/non-finite sorted to end)
    candidateOptions.sort((a, b) => {
      const aNet = isValidNum(a.estimatedNetRealization) ? a.estimatedNetRealization : -Infinity;
      const bNet = isValidNum(b.estimatedNetRealization) ? b.estimatedNetRealization : -Infinity;
      return bNet - aNet;
    });

    // Assign rank
    candidateOptions.forEach((opt, idx) => {
      opt.rank = idx + 1;
    });

    const top = candidateOptions[0];
    const second = candidateOptions.length > 1 ? candidateOptions[1] : null;

    // Explainable Rationale comparing the top channels with strict NaN/null guards
    let rationale = '';
    if (second) {
      const bothNetValid = isValidNum(top.estimatedNetRealization) && isValidNum(second.estimatedNetRealization);

      if (bothNetValid) {
        const netDiff = Math.round(top.estimatedNetRealization - second.estimatedNetRealization);

        if (
          isValidNum(top.expectedGrossPricePerUnit) &&
          isValidNum(second.expectedGrossPricePerUnit) &&
          top.expectedGrossPricePerUnit < second.expectedGrossPricePerUnit
        ) {
          rationale = `Recommended: ${top.channelName}. Although ${second.channelName} offers a higher gross price (₹${second.expectedGrossPricePerUnit} vs ₹${top.expectedGrossPricePerUnit}/${unit}), ${top.channelName} produces ₹${netDiff.toLocaleString()} HIGHER estimated net profit after factoring in logistics savings (estimated ${top.distanceKm} km vs ${second.distanceKm} km straight-line distance) and statutory deductions.`;
        } else if (
          isValidNum(top.logisticsCost) &&
          isValidNum(second.logisticsCost) &&
          top.logisticsCost < second.logisticsCost &&
          netDiff > 0
        ) {
          rationale = `Recommended: ${top.channelName}. Offers optimal economics with ₹${netDiff.toLocaleString()} higher estimated net return due to superior price realization and lower transit costs (estimated ${top.distanceKm} km vs ${second.distanceKm} km straight-line distance).`;
        } else {
          const perUnit = isValidNum(top.perUnitNetRealization) ? ` (₹${top.perUnitNetRealization}/${unit})` : '';
          rationale = `Recommended: ${top.channelName}. Maximizes your net realization at ₹${top.estimatedNetRealization.toLocaleString()}${perUnit} across viable selling channels.`;
        }
      } else {
        // Qualitative rationale when one or both estimated net values are unavailable/null
        const transitComparison =
          isValidNum(top.distanceKm) && isValidNum(second.distanceKm)
            ? ` (estimated ${top.distanceKm} km vs ${second.distanceKm} km straight-line distance)`
            : '';
        rationale = `Recommended: ${top.channelName}. Offers optimal liquidity through physical auction unloading with lower estimated transit distance${transitComparison}.`;
      }
    } else {
      if (isValidNum(top.estimatedNetRealization)) {
        rationale = `Recommended: ${top.channelName}. Best available single channel yielding ₹${top.estimatedNetRealization.toLocaleString()} net profit.`;
      } else {
        rationale = `Recommended: ${top.channelName}. Best available single channel based on geographic proximity and market liquidity.`;
      }
    }

    // Safety assertion: Ensure user-facing explanation never contains NaN, undefined, null, or Infinity
    if (/(NaN|undefined|null|Infinity)/.test(rationale)) {
      rationale = `Recommended: ${top.channelName}. Offers optimal selling channel performance based on available market and transit indicators.`;
    }

    const sellerOrigin = [dto.sellerLocation.city, dto.sellerLocation.state]
      .filter(Boolean)
      .join(', ') || 'Farmer Location';

    const result: SmartAllocationResult = {
      commodity: dto.commodity,
      quantity: qty,
      unit,
      sellerOrigin,
      rankedOptions: candidateOptions,
      recommendedOption: top,
      recommendationRationale: rationale,
      eliminatedCandidates: eliminated,
      settlementDistinctionNotice:
        'CRITICAL NOTICE: Smart Allocation figures represent pre-sale economic forecasts. Net realization is an algorithmic estimate subject to final weighbridge readings and actual carrier freight invoices.',
      generatedAt: new Date().toISOString(),
    };

    // Asynchronously log to AiPredictionLog for feedback tracing
    this.prisma.aiPredictionLog
      .create({
        data: {
          modelName: 'smart_allocation_optimizer_v1',
          modelVersion: '1.0.0',
          userId: userId ?? null,
          inputFeatures: dto as any,
          predictionOutput: {
            topRecommendation: top.channelName,
            estimatedNet: top.estimatedNetRealization,
            perUnitNet: top.perUnitNetRealization,
            totalChannelsEvaluated: candidateOptions.length,
          },
        },
      })
      .catch((e) => this.logger.warn(`Could not log smart allocation prediction: ${e.message}`));

    return result;
  }
}

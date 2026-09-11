import { Injectable, Logger } from '@nestjs/common';
import { BestTimeToSellDto } from '../dto/best-time-to-sell.dto.js';

export interface SellTimingResult {
  commodity: string;
  market: string;
  currentPrice: number;
  recommendation: 'Sell now' | 'Consider selling soon' | 'Consider waiting' | 'Insufficient evidence';
  recommendationSummary: string;
  supportingFactors: string[];
  forwardProjections: {
    horizon7DaysPrice: number | null;
    horizon14DaysPrice: number | null;
    expectedChangePercent: number | null;
  };
  marketActivityProxy: string;
  perishabilityRiskAssessment: string;
  limitations: string[];
  generatedAt: string;
}

@Injectable()
export class SellTimingService {
  private readonly logger = new Logger(SellTimingService.name);

  evaluate(
    dto: BestTimeToSellDto,
    marketIntelligence?: any,
  ): SellTimingResult {
    const commodity = dto.commodity.trim();
    const market = dto.market || 'Azadpur';
    const isPerishable = Boolean(dto.isHighlyPerishable || ['tomato', 'banana', 'green chilli'].includes(commodity.toLowerCase()));

    const outlook = marketIntelligence?.forwardOutlook || marketIntelligence?.forward_outlook;

    // If no market intelligence was successfully fetched from AI service
    if (!marketIntelligence || !outlook) {
      return {
        commodity,
        market,
        currentPrice: dto.currentPrice || 0,
        recommendation: 'Insufficient evidence',
        recommendationSummary:
          'Insufficient historical forward model signals to provide a defensible timing recommendation.',
        supportingFactors: [
          'Forward price model inference is temporarily offline or data is sparse for this commodity.',
          'Rely on local physical APMC spot quotes and immediate buyer commitments.',
        ],
        forwardProjections: {
          horizon7DaysPrice: null,
          horizon14DaysPrice: null,
          expectedChangePercent: null,
        },
        marketActivityProxy: 'UNKNOWN',
        perishabilityRiskAssessment: isPerishable
          ? 'High perishability: prompt liquidation recommended to avoid post-harvest losses.'
          : 'Moderate shelf-life stability.',
        limitations: [
          'No speculative forward dates are manufactured when underlying ML features are unavailable.',
        ],
        generatedAt: new Date().toISOString(),
      };
    }

    const currentPrice = dto.currentPrice || outlook.current_modal_price || outlook.currentModalPrice || 2200;
    const proj7d = outlook.projected_7d_price ?? outlook.projected7dPrice ?? null;
    const proj14d = outlook.projected_14d_price ?? outlook.projected14dPrice ?? null;
    const changePct = outlook.projected_change_percent ?? outlook.projectedChangePercent ?? 0;
    const demandBand = outlook.demand_absorption_band || outlook.demandAbsorptionBand || 'MODERATE';

    const supportingFactors: string[] = [
      ...(outlook.supporting_factors || outlook.supportingFactors || []),
    ];
    let recommendation: 'Sell now' | 'Consider selling soon' | 'Consider waiting' | 'Insufficient evidence' = 'Sell now';
    let summary = '';

    // Logic combining price trajectory, perishability, and arrival absorption
    if (isPerishable) {
      // Perishables cannot be stored without substantial degradation
      if (changePct > 6.0 && demandBand === 'HIGH') {
        recommendation = 'Consider selling soon';
        summary = `While forward price indicates a +${changePct}% gain, ${commodity} is highly perishable. Staggering sales over the next 2 to 4 days balances upside while preventing spoilage.`;
        supportingFactors.push('Perishable shelf-life restricts long storage despite positive price momentum.');
      } else {
        recommendation = 'Sell now';
        summary = `Selling immediately is favorable. Expected price delta (${changePct > 0 ? '+' : ''}${changePct}%) does not compensate for post-harvest shrinkage, weight loss, and spoilage risk.`;
        supportingFactors.push('Holding perishable produce carries immediate quality degradation risks.');
      }
    } else {
      // Non-perishables (Onion, Potato, Wheat, Rice)
      if (changePct >= 3.5) {
        recommendation = 'Consider waiting';
        summary = `Model outlook projects an upward trajectory of +${changePct}% over the next 14 days, supported by ${demandBand.toLowerCase()} wholesale market absorption. Holding with proper ventilation is favorable.`;
        supportingFactors.push(`Projected 14-day modal price reaches ₹${proj14d}/q vs current ₹${currentPrice}/q.`);
      } else if (changePct <= -2.5) {
        recommendation = 'Sell now';
        summary = `Model indicates incoming supply pressure and a projected price decline of ${changePct}% over 14 days. Selling immediately locks in current prevailing market rates.`;
        supportingFactors.push('Downside momentum detected in wholesale arrival trends.');
      } else {
        recommendation = 'Sell now';
        summary = `Market outlook is relatively flat (${changePct > 0 ? '+' : ''}${changePct}%). Holding yields negligible expected gain against ongoing storage and handling costs.`;
        supportingFactors.push('Sideways market movement does not justify storage carrying costs.');
      }
    }

    return {
      commodity,
      market,
      currentPrice,
      recommendation,
      recommendationSummary: summary,
      supportingFactors,
      forwardProjections: {
        horizon7DaysPrice: proj7d,
        horizon14DaysPrice: proj14d,
        expectedChangePercent: changePct,
      },
      marketActivityProxy: demandBand,
      perishabilityRiskAssessment: isPerishable
        ? 'High: Perishable crop. Weight loss (~1-2%/week) and rotting risks apply if held without cold chain.'
        : 'Low to Moderate: Durable commodity capable of ambient storage with adequate aeration.',
      limitations: [
        'Advisory is derived from a model-backed heuristic evaluating arrival velocity and forward projections, NOT a dedicated trained optimal selling time model.',
        'High perishability increases the downside risk of holding produce without temperature-controlled storage.',
        'Predictions reflect APMC wholesale arrivals and seasonal patterns, not unmodeled weather events or policy export bans.',
        'Estimates are advisory decision support and do not represent a guaranteed forward settlement price.',
      ],
      generatedAt: new Date().toISOString(),
    };
  }
}

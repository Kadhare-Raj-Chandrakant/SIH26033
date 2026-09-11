import { describe, it, expect, beforeEach } from 'vitest';
import { SellTimingService } from './sell-timing.service.js';

describe('SellTimingService', () => {
  let service: SellTimingService;

  beforeEach(() => {
    service = new SellTimingService();
  });

  it('should recommend "Sell now" for highly perishable crops even with modest price gain', () => {
    const marketData = {
      forward_outlook: {
        current_modal_price: 2600,
        projected_7d_price: 2680,
        projected_14d_price: 2700,
        projected_change_percent: 3.8, // +3.8%
        demand_absorption_band: 'MODERATE',
        supporting_factors: ['Moderate arrival clearing'],
      },
    };

    const result = service.evaluate(
      {
        commodity: 'Tomato',
        market: 'Azadpur',
        currentPrice: 2600,
        isHighlyPerishable: true,
      },
      marketData,
    );

    expect(result.recommendation).toBe('Sell now');
    expect(result.recommendationSummary).toContain('shrinkage');
    expect(result.perishabilityRiskAssessment).toContain('Perishable');
  });

  it('should recommend "Consider waiting" for non-perishables with strong forward price momentum', () => {
    const marketData = {
      forward_outlook: {
        current_modal_price: 2100,
        projected_7d_price: 2200,
        projected_14d_price: 2280,
        projected_change_percent: 8.5, // +8.5%
        demand_absorption_band: 'HIGH',
        supporting_factors: ['Robust seasonal demand'],
      },
    };

    const result = service.evaluate(
      {
        commodity: 'Onion',
        market: 'Lasalgaon',
        currentPrice: 2100,
        isHighlyPerishable: false,
      },
      marketData,
    );

    expect(result.recommendation).toBe('Consider waiting');
    expect(result.recommendationSummary).toContain('+8.5%');
    expect(result.forwardProjections.horizon14DaysPrice).toBe(2280);
  });

  it('should recommend "Sell now" when model forecasts negative price momentum', () => {
    const marketData = {
      forward_outlook: {
        current_modal_price: 2400,
        projected_7d_price: 2320,
        projected_14d_price: 2260,
        projected_change_percent: -5.8, // -5.8%
        demand_absorption_band: 'LOW',
        supporting_factors: ['Surge in regional harvest arrivals'],
      },
    };

    const result = service.evaluate(
      {
        commodity: 'Potato',
        market: 'Agra',
        currentPrice: 2400,
      },
      marketData,
    );

    expect(result.recommendation).toBe('Sell now');
    expect(result.recommendationSummary).toContain('supply pressure');
  });

  it('should return "Insufficient evidence" when AI market intelligence is missing or offline', () => {
    const result = service.evaluate(
      {
        commodity: 'DragonFruit',
      },
      null,
    );

    expect(result.recommendation).toBe('Insufficient evidence');
    expect(result.supportingFactors.length).toBeGreaterThan(0);
    expect(result.forwardProjections.horizon7DaysPrice).toBeNull();
  });
});

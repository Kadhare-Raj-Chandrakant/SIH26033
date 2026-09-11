import { describe, it, expect, beforeEach } from 'vitest';
import { NetRealizationService } from './net-realization.service.js';

describe('NetRealizationService', () => {
  let service: NetRealizationService;

  beforeEach(() => {
    service = new NetRealizationService();
  });

  it('should accurately calculate gross value and deduction waterfall for Mandi sale', () => {
    const result = service.calculate({
      quantity: 50, // 50 quintals
      unit: 'QUINTAL',
      grossPricePerUnit: 2400, // ₹2,400/quintal
      destinationName: 'Pune APMC Mandi',
      distanceKm: 120,
      packagingCostPerUnit: 15,
      handlingCostPerUnit: 12,
      mandiCessPercent: 1.0,
      platformFeeRatePercent: 0,
      storageDays: 0,
    });

    expect(result.grossSellingValue).toBe(120000); // 50 * 2400
    expect(result.deductions.length).toBeGreaterThanOrEqual(4);

    // Verify logistics deduction
    const logistics = result.deductions.find((d) => d.category === 'LOGISTICS');
    expect(logistics).toBeDefined();
    expect(logistics?.status).toBe('ESTIMATED');
    expect(logistics?.amount).toBeGreaterThan(0);

    // Verify handling & packaging
    const packaging = result.deductions.find((d) => d.name === 'Packaging & Bagging');
    expect(packaging?.amount).toBe(750); // 50 * 15
    const handling = result.deductions.find((d) => d.name === 'Loading & Hamali (Handling)');
    expect(handling?.amount).toBe(600); // 50 * 12

    // Verify Mandi Cess
    const cess = result.deductions.find((d) => d.category === 'TAX');
    expect(cess?.amount).toBe(1200); // 1.0% of 120,000

    expect(result.totalDeductions).toBe(
      Math.round((logistics!.amount + 750 + 600 + 1200) * 100) / 100,
    );
    expect(result.estimatedNetRealization).toBe(
      Math.round((result.grossSellingValue - result.totalDeductions) * 100) / 100,
    );
    expect(result.perUnitNetRealization).toBe(
      Math.round((result.estimatedNetRealization / 50) * 100) / 100,
    );
    expect(result.calculationType).toBe('ESTIMATED_PRE_SALE');
    expect(result.settlementDistinctionNotice).toContain('CRITICAL DISTINCTION');
  });

  it('should accept explicit carrier quotes when provided', () => {
    const result = service.calculate({
      quantity: 20,
      grossPricePerUnit: 2000,
      logisticsCost: 2500, // Pre-negotiated quote
      destinationName: 'Direct Buyer Hub',
    });

    const logistics = result.deductions.find((d) => d.category === 'LOGISTICS');
    expect(logistics?.amount).toBe(2500);
    expect(logistics?.status).toBe('CALCULATED');
  });

  it('should mark logistics as UNAVAILABLE when neither cost nor distance is provided', () => {
    const result = service.calculate({
      quantity: 10,
      grossPricePerUnit: 1500,
    });

    const logistics = result.deductions.find((d) => d.category === 'LOGISTICS');
    expect(logistics?.status).toBe('UNAVAILABLE');
    expect(logistics?.amount).toBe(0);
    expect(result.assumptions).toContain(
      'Logistics cost is omitted / assumed farm-gate collection.',
    );
  });

  it('should calculate storage fees when holding period is specified', () => {
    const result = service.calculate({
      quantity: 30,
      grossPricePerUnit: 2100,
      storageDays: 10,
      storageRatePerUnitDay: 2.5,
    });

    const storage = result.deductions.find((d) => d.category === 'STORAGE');
    expect(storage?.status).toBe('CALCULATED');
    expect(storage?.amount).toBe(750); // 30 * 10 * 2.5
  });
});

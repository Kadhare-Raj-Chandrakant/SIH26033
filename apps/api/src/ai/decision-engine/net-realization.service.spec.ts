import { describe, it, expect, beforeEach } from 'vitest';
import { NetRealizationService } from './net-realization.service.js';

describe('NetRealizationService', () => {
  let service: NetRealizationService;

  beforeEach(() => {
    service = new NetRealizationService();
  });

  it('should accurately calculate gross value and deduction waterfall with explicit provenance and no escrow terminology', () => {
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

    // Verify logistics deduction has explicit provenance and straight-line semantics
    const logistics = result.deductions.find((d) => d.category === 'LOGISTICS');
    expect(logistics).toBeDefined();
    expect(logistics?.status).toBe('ESTIMATED');
    expect(logistics?.source).toContain('straight-line geographic distance');
    expect(logistics?.amount).toBeGreaterThan(0);

    // Verify handling & packaging with user provided status
    const packaging = result.deductions.find((d) => d.name === 'Packaging & Bagging');
    expect(packaging?.amount).toBe(750); // 50 * 15
    expect(packaging?.status).toBe('USER_PROVIDED');
    expect(packaging?.source).toBe('User input parameter');

    const handling = result.deductions.find((d) => d.name === 'Loading & Hamali (Handling)');
    expect(handling?.amount).toBe(600); // 50 * 12
    expect(handling?.status).toBe('USER_PROVIDED');
    expect(handling?.source).toBe('User input parameter');

    // Verify Mandi Cess
    const cess = result.deductions.find((d) => d.category === 'TAX');
    expect(cess?.amount).toBe(1200); // 1.0% of 120,000
    expect(cess?.status).toBe('CALCULATED');
    expect(cess?.source).toContain('APMC');

    // Verify removal of escrow terminology: fees must be Platform Service Fee
    const feeItem = result.deductions.find((d) => d.category === 'FEES');
    expect(feeItem?.name).toBe('Platform Service Fee');
    expect(feeItem?.name).not.toContain('Escrow');

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

    // Verify EVERY deduction has a non-empty source and valid status
    for (const d of result.deductions) {
      expect(d.source).toBeDefined();
      expect(d.source.length).toBeGreaterThan(0);
      expect(['ACTUAL', 'CALCULATED', 'ESTIMATED', 'USER_PROVIDED', 'UNAVAILABLE', 'NOT_APPLICABLE']).toContain(d.status);
    }
  });

  it('should accept explicit user-provided carrier quotes when provided', () => {
    const result = service.calculate({
      quantity: 20,
      grossPricePerUnit: 2000,
      logisticsCost: 2500, // Pre-negotiated quote
      destinationName: 'Direct Buyer Hub',
    });

    const logistics = result.deductions.find((d) => d.category === 'LOGISTICS');
    expect(logistics?.amount).toBe(2500);
    expect(logistics?.status).toBe('USER_PROVIDED');
    expect(logistics?.source).toBe('User input parameter');
  });

  it('should mark logistics as UNAVAILABLE and not assume zero when neither cost nor distance is provided', () => {
    const result = service.calculate({
      quantity: 10,
      grossPricePerUnit: 1500,
    });

    const logistics = result.deductions.find((d) => d.category === 'LOGISTICS');
    expect(logistics?.status).toBe('UNAVAILABLE');
    expect(logistics?.amount).toBe(0);
    expect(logistics?.source).toContain('unspecified');
    expect(result.assumptions).toContain(
      'Logistics cost is unavailable / omitted from net realization deductions.',
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
    expect(storage?.status).toBe('USER_PROVIDED');
    expect(storage?.amount).toBe(750); // 30 * 10 * 2.5
    expect(storage?.source).toBe('User input parameter');
  });

  it('should use demonstration benchmark assumption for default handling and packaging when omitted', () => {
    const result = service.calculate({
      quantity: 10,
      grossPricePerUnit: 2000,
      distanceKm: 50,
      // handling and packaging omitted
    });

    const packaging = result.deductions.find((d) => d.name === 'Packaging & Bagging');
    expect(packaging?.status).toBe('ESTIMATED');
    expect(packaging?.source).toContain('Demonstration benchmark assumption');

    const handling = result.deductions.find((d) => d.name === 'Loading & Hamali (Handling)');
    expect(handling?.status).toBe('ESTIMATED');
    expect(handling?.source).toContain('Demonstration benchmark assumption');
  });
});

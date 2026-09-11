import { Injectable, Logger } from '@nestjs/common';
import { CalculateNetRealizationDto } from '../dto/net-realization.dto.js';

export interface DeductionItem {
  name: string;
  category: 'LOGISTICS' | 'HANDLING' | 'STORAGE' | 'FEES' | 'TAX';
  amount: number;
  perUnit: number;
  status: 'CALCULATED' | 'ESTIMATED' | 'UNAVAILABLE' | 'NOT_APPLICABLE';
  notes: string;
}

export interface NetRealizationResult {
  grossSellingValue: number;
  grossPricePerUnit: number;
  quantity: number;
  unit: string;
  deductions: DeductionItem[];
  totalDeductions: number;
  estimatedNetRealization: number;
  perUnitNetRealization: number;
  assumptions: string[];
  calculationType: 'ESTIMATED_PRE_SALE';
  settlementDistinctionNotice: string;
  generatedAt: string;
}

@Injectable()
export class NetRealizationService {
  private readonly logger = new Logger(NetRealizationService.name);

  calculate(dto: CalculateNetRealizationDto): NetRealizationResult {
    const qty = Math.max(0.001, Number(dto.quantity));
    const grossPrice = Number(dto.grossPricePerUnit);
    const grossSellingValue = Math.round(qty * grossPrice * 100) / 100;

    const deductions: DeductionItem[] = [];
    const assumptions: string[] = [];

    // 1. Logistics Deduction
    let logisticsAmt = 0;
    let logisticsStatus: 'CALCULATED' | 'ESTIMATED' | 'UNAVAILABLE' = 'UNAVAILABLE';
    let logisticsNotes = 'No freight cost or distance provided; logistics cost is unavailable.';

    if (dto.logisticsCost !== undefined && dto.logisticsCost !== null) {
      logisticsAmt = Math.round(Number(dto.logisticsCost) * 100) / 100;
      logisticsStatus = 'CALCULATED';
      logisticsNotes = 'Provided from explicit logistics carrier quote / agreement.';
    } else if (dto.distanceKm !== undefined && dto.distanceKm !== null && dto.distanceKm > 0) {
      // Benchmark tariff: ₹400 base + (distanceKm * weightTonne * ₹3.50 * 1.10 fuel surcharge)
      const weightTonne = (qty * 100) / 1000; // Assuming quintals -> tonnes
      const baseFare = 400;
      const distanceFare = Number(dto.distanceKm) * weightTonne * 3.5;
      const fuel = (baseFare + distanceFare) * 0.1;
      logisticsAmt = Math.round((baseFare + distanceFare + fuel) * 100) / 100;
      logisticsStatus = 'ESTIMATED';
      logisticsNotes = `Estimated for ${dto.distanceKm} km transit via standard agri freight benchmark.`;
      assumptions.push(`Logistics estimated at standard ₹3.50/tonne-km with 10% fuel factor over ${dto.distanceKm} km.`);
    } else {
      assumptions.push('Logistics cost is omitted / assumed farm-gate collection.');
    }

    deductions.push({
      name: 'Freight & Transportation',
      category: 'LOGISTICS',
      amount: logisticsAmt,
      perUnit: Math.round((logisticsAmt / qty) * 100) / 100,
      status: logisticsStatus,
      notes: logisticsNotes,
    });

    // 2. Packaging & Handling Deductions
    const pkgPerUnit = dto.packagingCostPerUnit !== undefined ? Number(dto.packagingCostPerUnit) : 15.0; // Default ₹15/quintal
    const pkgAmt = Math.round(pkgPerUnit * qty * 100) / 100;
    deductions.push({
      name: 'Packaging & Bagging',
      category: 'HANDLING',
      amount: pkgAmt,
      perUnit: pkgPerUnit,
      status: dto.packagingCostPerUnit !== undefined ? 'CALCULATED' : 'ESTIMATED',
      notes: `Standard grading, bagging, and gunny sacks at ₹${pkgPerUnit}/unit.`,
    });

    const hndPerUnit = dto.handlingCostPerUnit !== undefined ? Number(dto.handlingCostPerUnit) : 12.0; // Default ₹12/quintal
    const hndAmt = Math.round(hndPerUnit * qty * 100) / 100;
    deductions.push({
      name: 'Loading & Hamali (Handling)',
      category: 'HANDLING',
      amount: hndAmt,
      perUnit: hndPerUnit,
      status: dto.handlingCostPerUnit !== undefined ? 'CALCULATED' : 'ESTIMATED',
      notes: `Loading, weighbridge tare handling at ₹${hndPerUnit}/unit.`,
    });

    // 3. Storage Cost
    const storageDays = Math.max(0, Number(dto.storageDays || 0));
    const storageRate = Math.max(0, Number(dto.storageRatePerUnitDay || (storageDays > 0 ? 1.5 : 0)));
    const storageAmt = Math.round(storageDays * storageRate * qty * 100) / 100;

    deductions.push({
      name: 'Cold Storage / Holding',
      category: 'STORAGE',
      amount: storageAmt,
      perUnit: Math.round((storageAmt / qty) * 100) / 100,
      status: storageDays > 0 ? 'CALCULATED' : 'NOT_APPLICABLE',
      notes: storageDays > 0
        ? `Holding for ${storageDays} days at ₹${storageRate}/unit/day.`
        : 'Immediate dispatch; no holding or warehousing fees applied.',
    });

    // 4. Platform Fee
    const platformRate = dto.platformFeeRatePercent !== undefined ? Number(dto.platformFeeRatePercent) : 1.5;
    const platformAmt = Math.round(((grossSellingValue * platformRate) / 100) * 100) / 100;
    deductions.push({
      name: 'Platform Technology & Escrow Fee',
      category: 'FEES',
      amount: platformAmt,
      perUnit: Math.round((platformAmt / qty) * 100) / 100,
      status: 'CALCULATED',
      notes: `Platform facilitation charge at ${platformRate}% of gross transaction value.`,
    });

    // 5. Mandi Cess (if applicable)
    if (dto.mandiCessPercent && dto.mandiCessPercent > 0) {
      const cessAmt = Math.round(((grossSellingValue * dto.mandiCessPercent) / 100) * 100) / 100;
      deductions.push({
        name: 'APMC Market Cess & Tax',
        category: 'TAX',
        amount: cessAmt,
        perUnit: Math.round((cessAmt / qty) * 100) / 100,
        status: 'CALCULATED',
        notes: `Statutory agricultural market committee cess at ${dto.mandiCessPercent}%.`,
      });
    }

    // Totals
    const totalDeductions = Math.round(
      deductions.reduce((acc, curr) => acc + curr.amount, 0) * 100,
    ) / 100;

    const estimatedNetRealization = Math.max(0, Math.round((grossSellingValue - totalDeductions) * 100) / 100);
    const perUnitNetRealization = Math.round((estimatedNetRealization / qty) * 100) / 100;

    return {
      grossSellingValue,
      grossPricePerUnit: grossPrice,
      quantity: qty,
      unit: dto.unit || 'QUINTAL',
      deductions,
      totalDeductions,
      estimatedNetRealization,
      perUnitNetRealization,
      assumptions,
      calculationType: 'ESTIMATED_PRE_SALE',
      settlementDistinctionNotice:
        'CRITICAL DISTINCTION: This represents an algorithmic estimate calculated prior to sale. Actual settlement occurs post-delivery upon buyer physical acceptance and verified weighbridge receipt.',
      generatedAt: new Date().toISOString(),
    };
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { CalculateNetRealizationDto } from '../dto/net-realization.dto.js';

export interface DeductionItem {
  name: string;
  category: 'LOGISTICS' | 'HANDLING' | 'STORAGE' | 'FEES' | 'TAX';
  amount: number;
  perUnit: number;
  status: 'ACTUAL' | 'CALCULATED' | 'ESTIMATED' | 'USER_PROVIDED' | 'UNAVAILABLE' | 'NOT_APPLICABLE';
  source: string;
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
    let logisticsStatus: 'ACTUAL' | 'CALCULATED' | 'ESTIMATED' | 'USER_PROVIDED' | 'UNAVAILABLE' = 'UNAVAILABLE';
    let logisticsSource = 'None (Destination or distance unspecified)';
    let logisticsNotes = 'No freight cost or distance provided; logistics cost is unavailable (not assumed free).';

    if (dto.logisticsCost !== undefined && dto.logisticsCost !== null) {
      logisticsAmt = Math.round(Number(dto.logisticsCost) * 100) / 100;
      logisticsStatus = 'USER_PROVIDED';
      logisticsSource = 'User input parameter';
      logisticsNotes = 'Provided from explicit logistics carrier quote or user payload.';
    } else if (dto.distanceKm !== undefined && dto.distanceKm !== null && dto.distanceKm > 0) {
      // Benchmark tariff: ₹400 base + (distanceKm * weightTonne * ₹3.50 * 1.10 fuel surcharge)
      const weightTonne = (qty * 100) / 1000; // Assuming quintals -> tonnes
      const baseFare = 400;
      const distanceFare = Number(dto.distanceKm) * weightTonne * 3.5;
      const fuel = (baseFare + distanceFare) * 0.1;
      logisticsAmt = Math.round((baseFare + distanceFare + fuel) * 100) / 100;
      logisticsStatus = 'ESTIMATED';
      logisticsSource = 'Configured benchmark tariff on estimated straight-line geographic distance';
      logisticsNotes = `Estimated for ${dto.distanceKm} km straight-line geographic distance via benchmark tariff.`;
      assumptions.push(`Logistics estimated at standard ₹3.50/tonne-km with 10% fuel factor over ${dto.distanceKm} km straight-line geographic distance.`);
    } else {
      assumptions.push('Logistics cost is unavailable / omitted from net realization deductions.');
    }

    deductions.push({
      name: 'Freight & Transportation',
      category: 'LOGISTICS',
      amount: logisticsAmt,
      perUnit: Math.round((logisticsAmt / qty) * 100) / 100,
      status: logisticsStatus,
      source: logisticsSource,
      notes: logisticsNotes,
    });

    // 2. Packaging & Handling Deductions
    const isUserPkg = dto.packagingCostPerUnit !== undefined;
    const pkgPerUnit = isUserPkg ? Number(dto.packagingCostPerUnit) : 15.0; // Default demonstration benchmark ₹15/quintal
    const pkgAmt = Math.round(pkgPerUnit * qty * 100) / 100;
    deductions.push({
      name: 'Packaging & Bagging',
      category: 'HANDLING',
      amount: pkgAmt,
      perUnit: pkgPerUnit,
      status: isUserPkg ? 'USER_PROVIDED' : 'ESTIMATED',
      source: isUserPkg ? 'User input parameter' : 'Demonstration benchmark assumption (₹15/unit standard bagging)',
      notes: isUserPkg
        ? `User-specified packaging cost at ₹${pkgPerUnit}/unit.`
        : `Illustrative configured packaging estimate at ₹${pkgPerUnit}/unit.`,
    });

    const isUserHnd = dto.handlingCostPerUnit !== undefined;
    const hndPerUnit = isUserHnd ? Number(dto.handlingCostPerUnit) : 12.0; // Default demonstration benchmark ₹12/quintal
    const hndAmt = Math.round(hndPerUnit * qty * 100) / 100;
    deductions.push({
      name: 'Loading & Hamali (Handling)',
      category: 'HANDLING',
      amount: hndAmt,
      perUnit: hndPerUnit,
      status: isUserHnd ? 'USER_PROVIDED' : 'ESTIMATED',
      source: isUserHnd ? 'User input parameter' : 'Demonstration benchmark assumption (₹12/unit standard handling)',
      notes: isUserHnd
        ? `User-specified loading & handling at ₹${hndPerUnit}/unit.`
        : `Illustrative configured handling estimate at ₹${hndPerUnit}/unit.`,
    });

    // 3. Storage Cost
    const storageDays = Math.max(0, Number(dto.storageDays || 0));
    const isUserStorageRate = dto.storageRatePerUnitDay !== undefined;
    const storageRate = Math.max(0, Number(dto.storageRatePerUnitDay || (storageDays > 0 ? 1.5 : 0)));
    const storageAmt = Math.round(storageDays * storageRate * qty * 100) / 100;

    deductions.push({
      name: 'Cold Storage / Holding',
      category: 'STORAGE',
      amount: storageAmt,
      perUnit: Math.round((storageAmt / qty) * 100) / 100,
      status: storageDays > 0 ? (isUserStorageRate ? 'USER_PROVIDED' : 'CALCULATED') : 'NOT_APPLICABLE',
      source: storageDays > 0
        ? (isUserStorageRate ? 'User input parameter' : 'Configured holding tariff benchmark (₹1.50/unit/day)')
        : 'Business rule (no storage duration specified)',
      notes: storageDays > 0
        ? `Holding for ${storageDays} days at ₹${storageRate}/unit/day.`
        : 'Immediate dispatch; no holding or warehousing fees applied.',
    });

    // 4. Platform Fee
    const isUserPlatRate = dto.platformFeeRatePercent !== undefined;
    const platformRate = isUserPlatRate ? Number(dto.platformFeeRatePercent) : 1.5;
    const platformAmt = Math.round(((grossSellingValue * platformRate) / 100) * 100) / 100;
    deductions.push({
      name: 'Platform Service Fee',
      category: 'FEES',
      amount: platformAmt,
      perUnit: Math.round((platformAmt / qty) * 100) / 100,
      status: 'CALCULATED',
      source: isUserPlatRate ? 'User-provided rate parameter' : 'Platform transaction fee schedule (1.5%)',
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
        source: `Applicable APMC statutory regulation (${dto.mandiCessPercent}%)`,
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

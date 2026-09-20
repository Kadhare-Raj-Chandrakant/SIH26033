import { IsNumber, IsOptional, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSettlementDto {
  @ApiPropertyOptional({ description: 'FPO administrative commission percentage (0 - 100%)', example: 3 })
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(0)
  @Max(100)
  @IsOptional()
  @Type(() => Number)
  commissionPercent?: number;

  @ApiPropertyOptional({ description: 'FPO commission percentage alias (0 - 100%)', example: 3 })
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(0)
  @Max(100)
  @IsOptional()
  @Type(() => Number)
  fpoCommissionPercentage?: number;

  @ApiPropertyOptional({ description: 'Total logistics and transportation cost (INR)', example: 15000 })
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  transportCost?: number;

  @ApiPropertyOptional({ description: 'Total grading, weighing, and handling cost (INR)', example: 8000 })
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  handlingCost?: number;

  @ApiPropertyOptional({ description: 'Any other miscellaneous deductions (INR)', example: 0 })
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  otherDeductions?: number;
}

import { IsNumber, IsPositive, IsString, IsOptional, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CalculateNetRealizationDto {
  @ApiProperty({ example: 50, description: 'Quantity in specified units' })
  @IsNumber()
  @IsPositive()
  quantity: number;

  @ApiPropertyOptional({ example: 'QUINTAL', description: 'Unit of measure (QUINTAL, KG, TONNE)' })
  @IsString()
  @IsOptional()
  unit?: string;

  @ApiProperty({ example: 2400.0, description: 'Gross expected selling price per unit in INR' })
  @IsNumber()
  @IsPositive()
  grossPricePerUnit: number;

  @ApiPropertyOptional({ example: 'Pune APMC Mandi', description: 'Destination channel name' })
  @IsString()
  @IsOptional()
  destinationName?: string;

  @ApiPropertyOptional({ example: 3500.0, description: 'Explicit logistics freight cost if already known' })
  @IsNumber()
  @IsOptional()
  @Min(0)
  logisticsCost?: number;

  @ApiPropertyOptional({ example: 120, description: 'Distance in kilometers for freight estimation' })
  @IsNumber()
  @IsOptional()
  @Min(0)
  distanceKm?: number;

  @ApiPropertyOptional({ example: 7, description: 'Storage duration in days (0 if immediate sale)' })
  @IsNumber()
  @IsOptional()
  @Min(0)
  storageDays?: number;

  @ApiPropertyOptional({ example: 2.0, description: 'Storage rate per unit per day' })
  @IsNumber()
  @IsOptional()
  @Min(0)
  storageRatePerUnitDay?: number;

  @ApiPropertyOptional({ example: 20.0, description: 'Packaging and grading cost per unit' })
  @IsNumber()
  @IsOptional()
  @Min(0)
  packagingCostPerUnit?: number;

  @ApiPropertyOptional({ example: 15.0, description: 'Loading and handling cost per unit' })
  @IsNumber()
  @IsOptional()
  @Min(0)
  handlingCostPerUnit?: number;

  @ApiPropertyOptional({ example: 1.5, description: 'Platform or transaction fee percentage' })
  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(100)
  platformFeeRatePercent?: number;

  @ApiPropertyOptional({ example: 1.0, description: 'APMC market cess percentage (if selling at Mandi)' })
  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(100)
  mandiCessPercent?: number;
}

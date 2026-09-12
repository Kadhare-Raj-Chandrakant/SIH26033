import { IsNumber, IsPositive, IsString, IsOptional, Min, Max, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CalculateNetRealizationDto {
  @ApiProperty({ example: 50, description: 'Quantity in specified units' })
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @IsPositive()
  @Max(10000000)
  quantity: number;

  @ApiPropertyOptional({ example: 'QUINTAL', description: 'Unit of measure (QUINTAL, KG, TONNE)' })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  unit?: string;

  @ApiProperty({ example: 2400.0, description: 'Gross expected selling price per unit in INR' })
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @IsPositive()
  @Max(10000000)
  grossPricePerUnit: number;

  @ApiPropertyOptional({ example: 'Pune APMC Mandi', description: 'Destination channel name' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  destinationName?: string;

  @ApiPropertyOptional({ example: 3500.0, description: 'Explicit logistics freight cost if already known' })
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @IsOptional()
  @Min(0)
  @Max(10000000)
  logisticsCost?: number;

  @ApiPropertyOptional({ example: 120, description: 'Distance in kilometers for freight estimation' })
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @IsOptional()
  @Min(0)
  @Max(10000)
  distanceKm?: number;

  @ApiPropertyOptional({ example: 7, description: 'Storage duration in days (0 if immediate sale)' })
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @IsOptional()
  @Min(0)
  @Max(365)
  storageDays?: number;

  @ApiPropertyOptional({ example: 2.0, description: 'Storage rate per unit per day' })
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @IsOptional()
  @Min(0)
  @Max(100000)
  storageRatePerUnitDay?: number;

  @ApiPropertyOptional({ example: 20.0, description: 'Packaging and grading cost per unit' })
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @IsOptional()
  @Min(0)
  @Max(100000)
  packagingCostPerUnit?: number;

  @ApiPropertyOptional({ example: 15.0, description: 'Loading and handling cost per unit' })
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @IsOptional()
  @Min(0)
  @Max(100000)
  handlingCostPerUnit?: number;

  @ApiPropertyOptional({ example: 1.5, description: 'Platform or transaction fee percentage' })
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @IsOptional()
  @Min(0)
  @Max(100)
  platformFeeRatePercent?: number;

  @ApiPropertyOptional({ example: 1.0, description: 'APMC market cess percentage (if selling at Mandi)' })
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @IsOptional()
  @Min(0)
  @Max(100)
  mandiCessPercent?: number;
}

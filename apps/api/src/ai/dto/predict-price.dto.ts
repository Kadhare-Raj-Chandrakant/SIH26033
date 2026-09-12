import { IsString, IsNotEmpty, IsOptional, IsNumber, Min, Max, MaxLength, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class PredictPriceDto {
  @ApiProperty({ description: 'Agricultural commodity name (e.g. Tomato, Wheat, Potato)', example: 'Tomato' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  commodity: string;

  @ApiPropertyOptional({ description: 'APMC mandi/market name', example: 'Azadpur' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  market?: string;

  @ApiPropertyOptional({ description: 'District name', example: 'North Delhi' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  district?: string;

  @ApiPropertyOptional({ description: 'State name', example: 'Delhi' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  state?: string;

  @ApiPropertyOptional({ description: 'Target date in YYYY-MM-DD format', example: '2026-09-15' })
  @IsString()
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'targetDate must be in YYYY-MM-DD format' })
  targetDate?: string;

  @ApiPropertyOptional({ description: 'Recent 1-day lagged price in INR/quintal', example: 2500 })
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @IsOptional()
  @Type(() => Number)
  @Min(0)
  @Max(10000000)
  historicalPriceLag1?: number;

  @ApiPropertyOptional({ description: 'Recent 7-day lagged price in INR/quintal', example: 2450 })
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @IsOptional()
  @Type(() => Number)
  @Min(0)
  @Max(10000000)
  historicalPriceLag7?: number;

  @ApiPropertyOptional({ description: 'Recent 7-day rolling average price in INR/quintal', example: 2480 })
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @IsOptional()
  @Type(() => Number)
  @Min(0)
  @Max(10000000)
  historicalPriceRolling7?: number;

  @ApiPropertyOptional({ description: 'Recent arrival volume in metric tonnes', example: 3200 })
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @IsOptional()
  @Type(() => Number)
  @Min(0)
  @Max(10000000)
  arrivalsLag1?: number;
}

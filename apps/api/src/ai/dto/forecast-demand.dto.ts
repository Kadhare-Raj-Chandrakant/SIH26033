import { IsString, IsOptional, IsNumber, Min, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class ForecastDemandDto {
  @ApiProperty({ description: 'Agricultural commodity name (e.g. Wheat, Tomato)', example: 'Wheat' })
  @IsString()
  @MaxLength(100)
  commodity: string;

  @ApiPropertyOptional({ description: 'APMC mandi/market name', example: 'Khanna' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  market?: string;

  @ApiPropertyOptional({ description: 'Forecast target date in YYYY-MM-DD format', example: '2026-09-15' })
  @IsString()
  @IsOptional()
  targetDate?: string;

  @ApiPropertyOptional({ description: 'Recent 1-day lagged arrival volume in metric tonnes', example: 3500 })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  @Min(0)
  arrivalsLag1?: number;

  @ApiPropertyOptional({ description: 'Recent 7-day rolling average arrival volume', example: 3400 })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  @Min(0)
  arrivalsRollingMean7?: number;

  @ApiPropertyOptional({ description: 'Recent 1-day lagged price in INR/quintal', example: 2800 })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  @Min(0)
  historicalPriceLag1?: number;
}

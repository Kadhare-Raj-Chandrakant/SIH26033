import { IsString, IsNotEmpty, IsOptional, IsNumber, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PriceIntelligenceDto {
  @ApiProperty({ example: 'Tomato', description: 'Commodity name' })
  @IsString()
  @IsNotEmpty()
  commodity: string;

  @ApiPropertyOptional({ example: 'Azadpur', description: 'Target APMC Mandi' })
  @IsString()
  @IsOptional()
  market?: string;

  @ApiPropertyOptional({ example: 'Nashik', description: 'District descriptor' })
  @IsString()
  @IsOptional()
  district?: string;

  @ApiPropertyOptional({ example: 'Maharashtra', description: 'State descriptor' })
  @IsString()
  @IsOptional()
  state?: string;

  @ApiPropertyOptional({ example: '2026-09-18', description: 'Target prediction date (YYYY-MM-DD)' })
  @IsString()
  @IsOptional()
  targetDate?: string;

  @ApiPropertyOptional({ example: 2500.0, description: 'Recent modal price anchor (INR/Quintal)' })
  @IsNumber()
  @IsOptional()
  @Min(0)
  recentPrice?: number;
}

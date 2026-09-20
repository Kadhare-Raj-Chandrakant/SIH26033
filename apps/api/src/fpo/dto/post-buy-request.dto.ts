import { IsString, IsNotEmpty, IsNumber, IsOptional, Min, Max, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PostBuyRequestDto {
  @ApiProperty({ description: 'Target commodity', example: 'Tomato' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  commodity: string;

  @ApiProperty({ description: 'Required bulk quantity in quintals', example: 500 })
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(1, { message: 'Quantity must be at least 1 quintal' })
  @Max(1000000)
  @Type(() => Number)
  requiredQuantity: number;

  @ApiPropertyOptional({ description: 'Target ceiling price willing to pay per quintal (in INR)', example: 1900 })
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(1)
  @Max(1000000)
  @IsOptional()
  @Type(() => Number)
  targetPrice?: number;

  @ApiPropertyOptional({ description: 'Preferred delivery city/destination', example: 'Pune' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  deliveryCity?: string;

  @ApiPropertyOptional({ description: 'Maximum procurement distance radius in km', example: 250 })
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(0)
  @Max(5000)
  @IsOptional()
  @Type(() => Number)
  maxDistanceKm?: number;

  @ApiPropertyOptional({ description: 'Quality and grading requirements', example: 'Firm red, uniform size, Grade A' })
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  qualityRequirements?: string;

  @ApiPropertyOptional({ description: 'Additional procurement terms and notes', example: 'Delivery needed by month end' })
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  notes?: string;

  @ApiPropertyOptional({ description: 'Expiration date for request (ISO string)', example: '2026-10-15' })
  @IsString()
  @IsOptional()
  expiresAt?: string;
}

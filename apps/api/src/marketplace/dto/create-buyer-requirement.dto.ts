import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsPositive,
  IsOptional,
  IsEnum,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProductUnit } from '@prisma/client';

export class CreateBuyerRequirementDto {
  @ApiProperty({ example: 'Onion', description: 'Commodity required' })
  @IsString()
  @IsNotEmpty()
  commodity: string;

  @ApiPropertyOptional({ example: 'Red / FAQ', description: 'Crop variety' })
  @IsString()
  @IsOptional()
  variety?: string;

  @ApiProperty({ example: 50, description: 'Required quantity' })
  @IsNumber()
  @IsPositive()
  requiredQuantity: number;

  @ApiPropertyOptional({ enum: ProductUnit, default: ProductUnit.QUINTAL })
  @IsEnum(ProductUnit)
  @IsOptional()
  unit?: ProductUnit;

  @ApiPropertyOptional({ example: 2250.0, description: 'Maximum ceiling price willing to pay per unit' })
  @IsNumber()
  @IsOptional()
  @Min(0)
  targetPrice?: number;

  @ApiPropertyOptional({ example: 'Nashik, Maharashtra', description: 'Destination city/district' })
  @IsString()
  @IsOptional()
  deliveryLocation?: string;

  @ApiPropertyOptional({ example: 19.997 })
  @IsNumber()
  @IsOptional()
  deliveryLatitude?: number;

  @ApiPropertyOptional({ example: 73.789 })
  @IsNumber()
  @IsOptional()
  deliveryLongitude?: number;

  @ApiPropertyOptional({ example: 300, description: 'Maximum fulfillment radius in kilometers' })
  @IsNumber()
  @IsOptional()
  @Min(10)
  maxDistanceKm?: number;

  @ApiPropertyOptional({ example: 'Urgent institutional procurement for restaurant chain.' })
  @IsString()
  @IsOptional()
  notes?: string;
}

import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsPositive,
  IsOptional,
  IsEnum,
  Min,
  Max,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProductUnit } from '@prisma/client';

export class CreateBuyerRequirementDto {
  @ApiProperty({ example: 'Onion', description: 'Commodity required' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  commodity: string;

  @ApiPropertyOptional({ example: 'Red / FAQ', description: 'Crop variety' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  variety?: string;

  @ApiProperty({ example: 50, description: 'Required quantity' })
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @IsPositive()
  @Max(10000000)
  requiredQuantity: number;

  @ApiPropertyOptional({ enum: ProductUnit, default: ProductUnit.QUINTAL })
  @IsEnum(ProductUnit)
  @IsOptional()
  unit?: ProductUnit;

  @ApiPropertyOptional({ example: 2250.0, description: 'Maximum ceiling price willing to pay per unit' })
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @IsOptional()
  @Min(0)
  @Max(10000000)
  targetPrice?: number;

  @ApiPropertyOptional({ example: 'Nashik, Maharashtra', description: 'Destination city/district' })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  deliveryLocation?: string;

  @ApiPropertyOptional({ example: 19.997 })
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @IsOptional()
  @Min(-90)
  @Max(90)
  deliveryLatitude?: number;

  @ApiPropertyOptional({ example: 73.789 })
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @IsOptional()
  @Min(-180)
  @Max(180)
  deliveryLongitude?: number;

  @ApiPropertyOptional({ example: 300, description: 'Maximum fulfillment radius in kilometers' })
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @IsOptional()
  @Min(10)
  @Max(10000)
  maxDistanceKm?: number;

  @ApiPropertyOptional({ example: 'Urgent institutional procurement for restaurant chain.' })
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  notes?: string;
}

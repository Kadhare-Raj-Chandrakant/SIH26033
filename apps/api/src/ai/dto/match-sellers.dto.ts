import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsPositive,
  IsOptional,
  ValidateNested,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LocationDto } from './smart-allocation.dto.js';

export class MatchSellersDto {
  @ApiProperty({ example: 'Tomato', description: 'Commodity required by buyer' })
  @IsString()
  @IsNotEmpty()
  commodity: string;

  @ApiProperty({ example: 25, description: 'Required quantity in Quintals' })
  @IsNumber()
  @IsPositive()
  requiredQuantity: number;

  @ApiPropertyOptional({ example: 2600.0, description: 'Target ceiling price per unit' })
  @IsNumber()
  @IsOptional()
  @Min(0)
  maxBudgetPerUnit?: number;

  @ApiProperty({ description: 'Buyer delivery destination' })
  @ValidateNested()
  @Type(() => LocationDto)
  deliveryLocation: LocationDto;

  @ApiPropertyOptional({ example: 350, description: 'Maximum sourcing distance in kilometers' })
  @IsNumber()
  @IsOptional()
  @Min(10)
  maxDistanceKm?: number;

  @ApiPropertyOptional({ example: 10, description: 'Maximum candidate matches to return' })
  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(50)
  limit?: number;
}

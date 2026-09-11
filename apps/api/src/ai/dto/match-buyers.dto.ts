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

export class MatchBuyersDto {
  @ApiProperty({ example: 'Onion', description: 'Commodity being offered' })
  @IsString()
  @IsNotEmpty()
  commodity: string;

  @ApiProperty({ example: 50, description: 'Available quantity in Quintals' })
  @IsNumber()
  @IsPositive()
  quantity: number;

  @ApiPropertyOptional({ example: 2150.0, description: 'Farmer asking price per unit' })
  @IsNumber()
  @IsOptional()
  @Min(0)
  askingPrice?: number;

  @ApiProperty({ description: 'Farmer location' })
  @ValidateNested()
  @Type(() => LocationDto)
  location: LocationDto;

  @ApiPropertyOptional({ example: 300, description: 'Maximum search radius in kilometers' })
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

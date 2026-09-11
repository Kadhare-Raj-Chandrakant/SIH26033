import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsPositive,
  IsOptional,
  IsBoolean,
  ValidateNested,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LocationDto {
  @ApiPropertyOptional({ example: 'Nashik' })
  @IsString()
  @IsOptional()
  city?: string;

  @ApiPropertyOptional({ example: 'Maharashtra' })
  @IsString()
  @IsOptional()
  state?: string;

  @ApiPropertyOptional({ example: '422001' })
  @IsString()
  @IsOptional()
  pincode?: string;

  @ApiPropertyOptional({ example: 19.997 })
  @IsNumber()
  @IsOptional()
  latitude?: number;

  @ApiPropertyOptional({ example: 73.789 })
  @IsNumber()
  @IsOptional()
  longitude?: number;
}

export class SmartAllocationDto {
  @ApiProperty({ example: 'Onion', description: 'Commodity to allocate' })
  @IsString()
  @IsNotEmpty()
  commodity: string;

  @ApiProperty({ example: 50, description: 'Quantity available for sale' })
  @IsNumber()
  @IsPositive()
  quantity: number;

  @ApiPropertyOptional({ example: 'QUINTAL', description: 'Unit of measure' })
  @IsString()
  @IsOptional()
  unit?: string;

  @ApiProperty({ description: 'Origin farm / warehouse location' })
  @ValidateNested()
  @Type(() => LocationDto)
  sellerLocation: LocationDto;

  @ApiPropertyOptional({ example: 1900.0, description: 'Minimum acceptable gross price threshold' })
  @IsNumber()
  @IsOptional()
  @Min(0)
  minAcceptablePrice?: number;

  @ApiPropertyOptional({ example: 400, description: 'Maximum transit distance in kilometers' })
  @IsNumber()
  @IsOptional()
  @Min(10)
  maxTransitDistanceKm?: number;

  @ApiPropertyOptional({ example: true, description: 'Include APMC mandi channel candidates' })
  @IsBoolean()
  @IsOptional()
  includeMandis?: boolean;

  @ApiPropertyOptional({ example: true, description: 'Include direct verified buyer candidates' })
  @IsBoolean()
  @IsOptional()
  includeDirectBuyers?: boolean;

  @ApiPropertyOptional({ example: true, description: 'Include platform marketplace listing candidate' })
  @IsBoolean()
  @IsOptional()
  includePlatformListing?: boolean;
}

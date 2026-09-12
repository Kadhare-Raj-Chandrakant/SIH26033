import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsPositive,
  IsOptional,
  IsBoolean,
  ValidateNested,
  Min,
  Max,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LocationDto {
  @ApiPropertyOptional({ example: 'Nashik' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  city?: string;

  @ApiPropertyOptional({ example: 'Maharashtra' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  state?: string;

  @ApiPropertyOptional({ example: '422001' })
  @IsString()
  @IsOptional()
  @MaxLength(20)
  pincode?: string;

  @ApiPropertyOptional({ example: 19.997 })
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @IsOptional()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @ApiPropertyOptional({ example: 73.789 })
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @IsOptional()
  @Min(-180)
  @Max(180)
  longitude?: number;
}

export class SmartAllocationDto {
  @ApiProperty({ example: 'Onion', description: 'Commodity to allocate' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  commodity: string;

  @ApiProperty({ example: 50, description: 'Quantity available for sale' })
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @IsPositive()
  @Max(10000000)
  quantity: number;

  @ApiPropertyOptional({ example: 'QUINTAL', description: 'Unit of measure' })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  unit?: string;

  @ApiProperty({ description: 'Origin farm / warehouse location' })
  @ValidateNested()
  @Type(() => LocationDto)
  sellerLocation: LocationDto;

  @ApiPropertyOptional({ example: 1900.0, description: 'Minimum acceptable gross price threshold' })
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @IsOptional()
  @Min(0)
  @Max(10000000)
  minAcceptablePrice?: number;

  @ApiPropertyOptional({ example: 400, description: 'Maximum transit distance in kilometers' })
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @IsOptional()
  @Min(10)
  @Max(10000)
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

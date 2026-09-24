import { IsOptional, IsNumber, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class GetRouteDto {
  @ApiPropertyOptional({ description: 'Origin latitude', example: 20.1469 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  originLat?: number;

  @ApiPropertyOptional({ description: 'Origin longitude', example: 74.2264 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  originLon?: number;

  @ApiPropertyOptional({ description: 'Destination latitude', example: 19.0771 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  destLat?: number;

  @ApiPropertyOptional({ description: 'Destination longitude', example: 72.9986 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  destLon?: number;

  @ApiPropertyOptional({ description: 'Origin District / Mandi name', example: 'Lasalgaon' })
  @IsOptional()
  @IsString()
  originDistrict?: string;

  @ApiPropertyOptional({ description: 'Origin State', example: 'Maharashtra' })
  @IsOptional()
  @IsString()
  originState?: string;

  @ApiPropertyOptional({ description: 'Destination District / Terminal Hub', example: 'Vashi' })
  @IsOptional()
  @IsString()
  destDistrict?: string;

  @ApiPropertyOptional({ description: 'Destination State', example: 'Maharashtra' })
  @IsOptional()
  @IsString()
  destState?: string;
}

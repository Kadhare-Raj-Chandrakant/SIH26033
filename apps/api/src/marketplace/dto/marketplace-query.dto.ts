import { IsString, IsOptional, IsNumber, Min, IsEnum, IsInt, Max, MaxLength, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export enum MarketplaceSort {
  PRICE_ASC = 'price_asc',
  PRICE_DESC = 'price_desc',
  NEWEST = 'newest',
  NAME_ASC = 'name_asc',
  NAME_DESC = 'name_desc',
}

export class MarketplaceQueryDto {
  @ApiPropertyOptional({ description: 'Optional text search across name, description, and category' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @ApiPropertyOptional({ description: 'Filter by category ID (UUID)' })
  @IsOptional()
  @IsUUID('4', { message: 'categoryId must be a valid UUID' })
  categoryId?: string;

  @ApiPropertyOptional({ description: 'Filter by location substring' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  location?: string;

  @ApiPropertyOptional({ description: 'Filter by state (e.g. Madhya Pradesh, Rajasthan)' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  state?: string;

  @ApiPropertyOptional({ description: 'Filter by district (e.g. Indore, Guntur)' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  district?: string;

  @ApiPropertyOptional({ description: 'Minimum price filter (>= 0)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'minPrice must be a valid number' })
  @Min(0, { message: 'minPrice cannot be negative' })
  minPrice?: number;

  @ApiPropertyOptional({ description: 'Maximum price filter (>= 0)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'maxPrice must be a valid number' })
  @Min(0, { message: 'maxPrice cannot be negative' })
  maxPrice?: number;

  @ApiPropertyOptional({
    enum: MarketplaceSort,
    default: MarketplaceSort.NEWEST,
    description: 'Sort ordering: price_asc, price_desc, newest, name_asc, name_desc',
  })
  @IsOptional()
  @IsEnum(MarketplaceSort, {
    message: 'sort must be one of: price_asc, price_desc, newest, name_asc, name_desc',
  })
  sort?: MarketplaceSort = MarketplaceSort.NEWEST;

  @ApiPropertyOptional({ description: 'Page number (>= 1)', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'page must be an integer' })
  @Min(1, { message: 'page must be at least 1' })
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Number of items per page (1-100)', default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'limit must be an integer' })
  @Min(1, { message: 'limit must be at least 1' })
  @Max(100, { message: 'limit cannot exceed 100' })
  limit?: number = 20;
}

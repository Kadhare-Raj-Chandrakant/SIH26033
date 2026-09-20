import { IsString, IsNotEmpty, IsNumber, IsOptional, Min, Max, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CommitListingDto {
  @ApiProperty({ description: 'Commodity name', example: 'Tomato' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  commodity: string;

  @ApiProperty({ description: 'Committed quantity in quintals', example: 20 })
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(0.1, { message: 'Quantity must be at least 0.1 quintals' })
  @Max(100000, { message: 'Quantity cannot exceed 100,000 quintals' })
  @Type(() => Number)
  quantityQuintals: number;

  @ApiPropertyOptional({ description: 'Quality grade (e.g. Grade A, Grade B, Premium)', example: 'Grade A' })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  qualityGrade?: string;

  @ApiPropertyOptional({ description: 'Expected harvest date (ISO string)', example: '2026-09-25' })
  @IsString()
  @IsOptional()
  expectedHarvestDate?: string;

  @ApiPropertyOptional({ description: 'Additional notes or harvest details', example: 'Organic farm certified, harvested at peak maturity' })
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  notes?: string;
}

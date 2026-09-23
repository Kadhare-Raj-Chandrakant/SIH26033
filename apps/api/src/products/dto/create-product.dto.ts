import { IsString, IsNotEmpty, IsNumber, IsEnum, Min, Max, IsOptional, MaxLength, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';
import { ProductUnit } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProductDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  description: string;

  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  categoryId: string;

  @ApiProperty()
  @IsNumber({ allowNaN: false, allowInfinity: false }, { message: 'Price must be a valid finite number' })
  @Min(0.01, { message: 'Price must be greater than 0' })
  @Max(10000000, { message: 'Price cannot exceed 10,000,000' })
  @Type(() => Number)
  price: number;

  @ApiProperty({ enum: ProductUnit })
  @IsEnum(ProductUnit)
  unit: ProductUnit;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @MaxLength(255)
  location?: string;

  @ApiPropertyOptional({ description: 'Specific commodity variety or cultivar' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  varietyType?: string;

  @ApiPropertyOptional({ description: 'Quality grade, specifications, or harvesting notes' })
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  notes?: string;

  @ApiPropertyOptional({ description: 'Primary image URL' })
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  primaryImage?: string;

  @ApiProperty({ description: 'Initial available inventory quantity' })
  @IsNumber({ allowNaN: false, allowInfinity: false }, { message: 'Initial quantity must be a valid finite number' })
  @Min(0.01, { message: 'Initial quantity must be greater than 0' })
  @Max(10000000, { message: 'Initial quantity cannot exceed 10,000,000' })
  @Type(() => Number)
  initialQuantity: number;
}

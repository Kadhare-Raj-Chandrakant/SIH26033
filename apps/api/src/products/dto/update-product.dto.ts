import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateProductDto } from './create-product.dto.js';
import { ProductStatus } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateProductDto extends PartialType(OmitType(CreateProductDto, ['initialQuantity'] as const)) {
  @ApiPropertyOptional({ enum: ProductStatus })
  @IsEnum(ProductStatus)
  @IsOptional()
  status?: ProductStatus;
}

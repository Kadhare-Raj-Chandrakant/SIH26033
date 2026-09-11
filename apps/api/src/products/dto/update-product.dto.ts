import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateProductDto } from './create-product.dto.js';
import { ProductStatus } from '@prisma/client';
import { IsIn, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export const ALLOWED_SELLER_STATUSES = [
  ProductStatus.ACTIVE,
  ProductStatus.OUT_OF_STOCK,
  ProductStatus.ARCHIVED,
] as const;

export class UpdateProductDto extends PartialType(OmitType(CreateProductDto, ['initialQuantity'] as const)) {
  @ApiPropertyOptional({
    enum: ALLOWED_SELLER_STATUSES,
    description: 'Product status (ACTIVE, OUT_OF_STOCK, ARCHIVED). REJECTED is moderation-only.',
  })
  @IsIn(ALLOWED_SELLER_STATUSES, {
    message: 'Status must be one of: ACTIVE, OUT_OF_STOCK, ARCHIVED. REJECTED cannot be set by sellers.',
  })
  @IsOptional()
  status?: ProductStatus;
}

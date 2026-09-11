import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProductStatus } from '@prisma/client';

export class ModerateProductDto {
  @ApiProperty({
    enum: ProductStatus,
    description: 'New product status set by administrator',
  })
  @IsNotEmpty()
  @IsEnum(ProductStatus)
  status: ProductStatus;

  @ApiPropertyOptional({ description: 'Administrative reason for moderation action' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

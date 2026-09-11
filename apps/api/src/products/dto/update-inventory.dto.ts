import { IsNumber, Min, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateInventoryDto {
  @ApiPropertyOptional({ description: 'Available quantity in stock' })
  @IsNumber()
  @Min(0, { message: 'Available quantity cannot be negative' })
  @IsOptional()
  @Type(() => Number)
  availableQuantity?: number;

  @ApiPropertyOptional({ description: 'Reserved quantity in stock' })
  @IsNumber()
  @Min(0, { message: 'Reserved quantity cannot be negative' })
  @IsOptional()
  @Type(() => Number)
  reservedQuantity?: number;
}

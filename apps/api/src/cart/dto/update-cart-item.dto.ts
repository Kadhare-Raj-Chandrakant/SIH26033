import { IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateCartItemDto {
  @ApiProperty({ description: 'New quantity for cart item (positive integer)', example: 3 })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  quantity: number;
}

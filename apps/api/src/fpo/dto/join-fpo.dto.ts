import { IsNumber, IsOptional, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class JoinFpoDto {
  @ApiPropertyOptional({ description: 'Contributed member share capital (in INR)', example: 1000 })
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(0)
  @Max(1000000)
  @IsOptional()
  @Type(() => Number)
  shareCapital?: number;
}

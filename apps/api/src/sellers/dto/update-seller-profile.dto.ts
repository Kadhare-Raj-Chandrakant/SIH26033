import { IsString, IsOptional, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateSellerProfileDto {
  @ApiPropertyOptional({ description: 'Business name (Farm name or FPO name)' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  businessName?: string;

  @ApiPropertyOptional({ description: 'Location of the farm or main operating area' })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  farmLocation?: string;
}

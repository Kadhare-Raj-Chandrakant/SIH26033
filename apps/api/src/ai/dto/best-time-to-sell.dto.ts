import { IsString, IsNotEmpty, IsOptional, IsNumber, Min, Max, MaxLength, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class BestTimeToSellDto {
  @ApiProperty({ example: 'Onion', description: 'Commodity name' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  commodity: string;

  @ApiPropertyOptional({ example: 'Lasalgaon', description: 'Primary reference APMC Mandi' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  market?: string;

  @ApiPropertyOptional({ example: 2100.0, description: 'Current available selling price anchor' })
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @IsOptional()
  @Min(0)
  @Max(10000000)
  currentPrice?: number;

  @ApiPropertyOptional({ example: false, description: 'Whether commodity has severe shelf-life decay (e.g. Tomato)' })
  @IsBoolean()
  @IsOptional()
  isHighlyPerishable?: boolean;
}

import { IsString, IsNotEmpty, IsOptional, IsNumber, Min, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class BestTimeToSellDto {
  @ApiProperty({ example: 'Onion', description: 'Commodity name' })
  @IsString()
  @IsNotEmpty()
  commodity: string;

  @ApiPropertyOptional({ example: 'Lasalgaon', description: 'Primary reference APMC Mandi' })
  @IsString()
  @IsOptional()
  market?: string;

  @ApiPropertyOptional({ example: 2100.0, description: 'Current available selling price anchor' })
  @IsNumber()
  @IsOptional()
  @Min(0)
  currentPrice?: number;

  @ApiPropertyOptional({ example: false, description: 'Whether commodity has severe shelf-life decay (e.g. Tomato)' })
  @IsBoolean()
  @IsOptional()
  isHighlyPerishable?: boolean;
}

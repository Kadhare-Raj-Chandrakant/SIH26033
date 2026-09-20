import { IsOptional, IsString, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { FpoStatus, FpoListingStatus, FpoBuyRequestStatus } from '@prisma/client';

export class FpoFilterDto {
  @ApiPropertyOptional({ description: 'Filter by state', example: 'Maharashtra' })
  @IsString()
  @IsOptional()
  state?: string;

  @ApiPropertyOptional({ description: 'Filter by district', example: 'Nashik' })
  @IsString()
  @IsOptional()
  district?: string;

  @ApiPropertyOptional({ description: 'Filter by commodity produced', example: 'Tomato' })
  @IsString()
  @IsOptional()
  commodity?: string;

  @ApiPropertyOptional({ description: 'Search term for FPO name', example: 'Agro' })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ enum: FpoStatus })
  @IsEnum(FpoStatus)
  @IsOptional()
  status?: FpoStatus;
}

export class FpoListingFilterDto {
  @ApiPropertyOptional({ enum: FpoListingStatus })
  @IsEnum(FpoListingStatus)
  @IsOptional()
  status?: FpoListingStatus;

  @ApiPropertyOptional({ description: 'Filter by commodity' })
  @IsString()
  @IsOptional()
  commodity?: string;
}

export class BuyRequestFilterDto {
  @ApiPropertyOptional({ description: 'Filter by commodity' })
  @IsString()
  @IsOptional()
  commodity?: string;

  @ApiPropertyOptional({ enum: FpoBuyRequestStatus })
  @IsEnum(FpoBuyRequestStatus)
  @IsOptional()
  status?: FpoBuyRequestStatus;
}

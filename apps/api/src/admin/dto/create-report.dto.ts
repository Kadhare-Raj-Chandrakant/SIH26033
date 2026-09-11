import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ReportTargetType } from '@prisma/client';

export class CreateReportDto {
  @ApiProperty({
    enum: ReportTargetType,
    description: 'Target entity type being reported (USER, PRODUCT, ORDER, SELLER)',
  })
  @IsNotEmpty()
  @IsEnum(ReportTargetType)
  targetType: ReportTargetType;

  @ApiProperty({ description: 'ID of the entity being reported' })
  @IsNotEmpty()
  @IsString()
  targetId: string;

  @ApiProperty({ description: 'Short reason or category of the report' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(200)
  reason: string;

  @ApiPropertyOptional({ description: 'Detailed description of the issue or concern' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;
}

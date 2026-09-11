import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ReportStatus } from '@prisma/client';

export class ReviewReportDto {
  @ApiProperty({
    enum: ReportStatus,
    description: 'Updated status of the moderation report (OPEN, UNDER_REVIEW, RESOLVED, DISMISSED)',
  })
  @IsNotEmpty()
  @IsEnum(ReportStatus)
  status: ReportStatus;

  @ApiPropertyOptional({ description: 'Resolution notes or explanation recorded by administrator' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  resolutionNotes?: string;
}

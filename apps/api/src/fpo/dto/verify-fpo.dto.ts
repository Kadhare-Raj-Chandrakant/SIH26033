import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FpoStatus } from '@prisma/client';

export class VerifyFpoDto {
  @ApiProperty({ enum: FpoStatus, description: 'Updated FPO status (ACTIVE, REJECTED, SUSPENDED)', example: FpoStatus.ACTIVE })
  @IsEnum(FpoStatus)
  status: FpoStatus;

  @ApiPropertyOptional({ description: 'Verification or rejection rationale', example: 'Registration certificate verified with ROC' })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  reason?: string;
}

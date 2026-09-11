import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AccountStatus } from '@prisma/client';

export class UpdateUserStatusDto {
  @ApiProperty({ enum: AccountStatus, description: 'New account status' })
  @IsNotEmpty()
  @IsEnum(AccountStatus)
  status: AccountStatus;

  @ApiPropertyOptional({ description: 'Reason for the administrative status change' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

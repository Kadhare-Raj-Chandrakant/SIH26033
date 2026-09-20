import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ApproveMembershipDto {
  @ApiProperty({ description: 'True to approve membership, false to reject', example: true })
  @IsBoolean()
  approve: boolean;

  @ApiPropertyOptional({ description: 'Rejection reason if membership is rejected', example: 'Farmer outside operational district' })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  reason?: string;
}

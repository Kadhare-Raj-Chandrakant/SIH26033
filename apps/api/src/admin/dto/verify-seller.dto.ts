import { IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class VerifySellerDto {
  @ApiProperty({
    enum: ['VERIFIED', 'REJECTED', 'PENDING'],
    description: 'Updated verification status for the seller/FPO profile',
  })
  @IsNotEmpty()
  @IsIn(['VERIFIED', 'REJECTED', 'PENDING'])
  verificationStatus: 'VERIFIED' | 'REJECTED' | 'PENDING';

  @ApiPropertyOptional({ description: 'Administrative reason/notes for the verification decision' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

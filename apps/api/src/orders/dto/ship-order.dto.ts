import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class ShipOrderDto {
  @ApiPropertyOptional({
    description: 'Simulate deterministic logistics failure for testing error handling and rollback',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  simulateFailure?: boolean;

  @ApiPropertyOptional({
    description: 'Optional carrier pickup instructions or packaging notes',
    example: 'Handle with care - fresh produce crates',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  carrierNotes?: string;
}

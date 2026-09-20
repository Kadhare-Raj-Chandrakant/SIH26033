import { IsArray, IsString, IsOptional, ArrayMinSize, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateBatchDto {
  @ApiProperty({ description: 'Array of committed listing IDs to aggregate into this batch', example: ['uuid-1', 'uuid-2'] })
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one listing ID must be provided' })
  @IsString({ each: true })
  listingIds: string[];

  @ApiPropertyOptional({ description: 'Batch quality grade classification', example: 'Grade A' })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  qualityGrade?: string;

  @ApiPropertyOptional({ description: 'Commodity name (inferred from listings if omitted)', example: 'Tomato' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  commodity?: string;
}

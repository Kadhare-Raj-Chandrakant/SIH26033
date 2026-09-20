import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class MatchBatchDto {
  @ApiProperty({ description: 'ID of the FpoBuyRequest to match with this batch', example: 'uuid-buy-request-id' })
  @IsString()
  @IsNotEmpty()
  buyRequestId: string;
}

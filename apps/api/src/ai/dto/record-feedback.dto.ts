import { IsString, IsOptional, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RecordFeedbackDto {
  @ApiProperty({ description: 'Target model name', example: 'price_predictor_baseline' })
  @IsString()
  modelName: string;

  @ApiProperty({ description: 'Model version that served the prediction', example: '1.0.0' })
  @IsString()
  modelVersion: string;

  @ApiPropertyOptional({ description: 'Unique prediction ID / log ID', example: 'clx123abc' })
  @IsString()
  @IsOptional()
  predictionId?: string;

  @ApiProperty({ description: 'Input features snapshot provided at prediction time' })
  @IsObject()
  featuresLogged: Record<string, any>;

  @ApiProperty({ description: 'Prediction output produced by the model' })
  @IsObject()
  predictionOutput: Record<string, any>;

  @ApiPropertyOptional({ description: 'Actual transaction or ground truth outcome observed' })
  @IsObject()
  @IsOptional()
  actualOutcome?: Record<string, any>;

  @ApiPropertyOptional({ description: 'User action or decision (ACCEPTED, OVERRIDDEN, REJECTED)', example: 'ACCEPTED' })
  @IsString()
  @IsOptional()
  userDecision?: string;
}

import { IsNumber, Min, Max, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class RecommendCropDto {
  @ApiProperty({ description: 'Nitrogen content ratio in soil (0 - 300)', example: 90 })
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Type(() => Number)
  @Min(0)
  @Max(300)
  N: number;

  @ApiProperty({ description: 'Phosphorus content ratio in soil (0 - 300)', example: 42 })
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Type(() => Number)
  @Min(0)
  @Max(300)
  P: number;

  @ApiProperty({ description: 'Potassium content ratio in soil (0 - 300)', example: 43 })
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Type(() => Number)
  @Min(0)
  @Max(300)
  K: number;

  @ApiProperty({ description: 'Ambient temperature in Celsius (-10 to 60)', example: 25.5 })
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Type(() => Number)
  @Min(-10)
  @Max(60)
  temperature: number;

  @ApiProperty({ description: 'Relative humidity percentage (0 - 100)', example: 78.0 })
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Type(() => Number)
  @Min(0)
  @Max(100)
  humidity: number;

  @ApiProperty({ description: 'Soil pH value (0 - 14)', example: 6.5 })
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Type(() => Number)
  @Min(0)
  @Max(14)
  ph: number;

  @ApiProperty({ description: 'Seasonal rainfall in mm (0 - 2500)', example: 200.0 })
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Type(() => Number)
  @Min(0)
  @Max(2500)
  rainfall: number;

  @ApiPropertyOptional({ description: 'Number of top crop candidates to return (1 - 10)', example: 3 })
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  @Max(10)
  topK?: number;
}

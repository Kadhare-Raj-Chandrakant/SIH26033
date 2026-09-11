import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AiService } from './ai.service.js';
import { PredictPriceDto } from './dto/predict-price.dto.js';
import { ForecastDemandDto } from './dto/forecast-demand.dto.js';
import { RecommendCropDto } from './dto/recommend-crop.dto.js';
import { RecordFeedbackDto } from './dto/record-feedback.dto.js';
import { Public } from '../common/decorators/public.decorator.js';
import { CurrentUser, type AuthUser } from '../common/decorators/current-user.decorator.js';

@ApiTags('AI & Machine Learning Foundation')
@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Public()
  @Get('health')
  @ApiOperation({ summary: 'Check AI service health status' })
  @ApiResponse({ status: 200, description: 'AI service is operational' })
  @ApiResponse({ status: 503, description: 'AI service is unreachable' })
  async checkHealth() {
    return this.aiService.checkHealth();
  }

  @Public()
  @Get('ready')
  @ApiOperation({ summary: 'Check if all AI baseline models are loaded in memory' })
  @ApiResponse({ status: 200, description: 'AI models are loaded and ready' })
  @ApiResponse({ status: 503, description: 'One or more models unavailable' })
  async checkReadiness() {
    return this.aiService.checkReadiness();
  }

  @Public()
  @Post('predict/price')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Infer baseline commodity modal price and explainability factors' })
  @ApiResponse({ status: 200, description: 'Predicted price and factors returned' })
  @ApiResponse({ status: 400, description: 'Validation failed on input features' })
  @ApiResponse({ status: 503, description: 'AI inference service unavailable' })
  async predictPrice(
    @Body() dto: PredictPriceDto,
    @CurrentUser() user?: AuthUser,
  ) {
    return this.aiService.predictPrice(dto, user?.sub);
  }

  @Public()
  @Post('predict/demand')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Forecast agricultural market arrival absorption / demand proxy' })
  @ApiResponse({ status: 200, description: 'Forecasted demand proxy returned' })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  @ApiResponse({ status: 503, description: 'AI service unavailable' })
  async forecastDemand(
    @Body() dto: ForecastDemandDto,
    @CurrentUser() user?: AuthUser,
  ) {
    return this.aiService.forecastDemand(dto, user?.sub);
  }

  @Public()
  @Post('predict/crop')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Recommend optimal crops given soil nutrients, pH, and climate variables' })
  @ApiResponse({ status: 200, description: 'Ranked crop recommendations returned' })
  @ApiResponse({ status: 400, description: 'Validation failed on soil or weather inputs' })
  @ApiResponse({ status: 503, description: 'AI service unavailable' })
  async recommendCrop(
    @Body() dto: RecommendCropDto,
    @CurrentUser() user?: AuthUser,
  ) {
    return this.aiService.recommendCrop(dto, user?.sub);
  }

  @Public()
  @Post('feedback')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Record prediction observation, user decision, or transaction outcome' })
  @ApiResponse({ status: 201, description: 'Feedback recorded successfully' })
  async recordFeedback(
    @Body() dto: RecordFeedbackDto,
    @CurrentUser() user?: AuthUser,
  ) {
    return this.aiService.recordFeedback(dto, user?.sub);
  }

  @Get('predictions/recent')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get recent prediction audit logs for current user' })
  @ApiResponse({ status: 200, description: 'List of recent prediction records' })
  async getRecentPredictions(
    @Query('limit') limit?: number,
    @CurrentUser() user?: AuthUser,
  ) {
    return this.aiService.getRecentPredictions(
      limit ? Number(limit) : 20,
      user?.sub,
    );
  }
}

import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
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
import { PriceIntelligenceDto } from './dto/price-intelligence.dto.js';
import { CalculateNetRealizationDto } from './dto/net-realization.dto.js';
import { BestTimeToSellDto } from './dto/best-time-to-sell.dto.js';
import { SmartAllocationDto } from './dto/smart-allocation.dto.js';
import { MatchBuyersDto } from './dto/match-buyers.dto.js';
import { MatchSellersDto } from './dto/match-sellers.dto.js';
import { Public } from '../common/decorators/public.decorator.js';
import { CurrentUser, type AuthUser } from '../common/decorators/current-user.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Role } from '@prisma/client';

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

  @ApiBearerAuth()
  @Post('feedback')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Record prediction observation, user decision, or transaction outcome' })
  @ApiResponse({ status: 201, description: 'Feedback recorded successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — cannot modify another user prediction record' })
  async recordFeedback(
    @Body() dto: RecordFeedbackDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.aiService.recordFeedback(dto, user.sub);
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

  @Public()
  @Get('market-intelligence/:commodity')
  @ApiOperation({ summary: 'Get comprehensive APMC market intelligence, cross-market comparison, and trends' })
  @ApiResponse({ status: 200, description: 'Market intelligence data returned' })
  async getMarketIntelligence(
    @Param('commodity') commodity: string,
    @Query('city') city?: string,
    @Query('state') state?: string,
    @Query('latitude') latitude?: number,
    @Query('longitude') longitude?: number,
  ) {
    const sellerLoc = (city || latitude)
      ? {
          city,
          state,
          latitude: latitude ? Number(latitude) : undefined,
          longitude: longitude ? Number(longitude) : undefined,
        }
      : undefined;
    return this.aiService.getMarketIntelligence(commodity, sellerLoc);
  }

  @Public()
  @Post('price-intelligence')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get explainable price intelligence, historical context, and factor influences' })
  @ApiResponse({ status: 200, description: 'Price intelligence returned' })
  async getPriceIntelligence(
    @Body() dto: PriceIntelligenceDto,
    @CurrentUser() user?: AuthUser,
  ) {
    return this.aiService.getPriceIntelligence(dto, user?.sub);
  }

  @Public()
  @Post('net-realization')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Calculate transparent gross-to-net realization waterfall with individual deductions' })
  @ApiResponse({ status: 200, description: 'Net realization breakdown returned' })
  calculateNetRealization(@Body() dto: CalculateNetRealizationDto) {
    return this.aiService.calculateNetRealization(dto);
  }

  @Public()
  @Post('best-time-to-sell')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Advisory on optimal selling horizon based on model trajectory and perishability' })
  @ApiResponse({ status: 200, description: 'Best time to sell advisory returned' })
  async getBestTimeToSell(@Body() dto: BestTimeToSellDto) {
    return this.aiService.getBestTimeToSell(dto);
  }

  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles(Role.FARMER, Role.FPO, Role.ADMIN)
  @Post('smart-allocation')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Smart Channel Optimization: Compare Mandis, Matched Buyers, and Platform channels' })
  @ApiResponse({ status: 200, description: 'Ranked channel options and explainable recommendation returned' })
  async optimizeSmartAllocation(
    @Body() dto: SmartAllocationDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.aiService.optimizeSmartAllocation(dto, user.sub);
  }

  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles(Role.FARMER, Role.FPO, Role.ADMIN)
  @Post('matching/buyers')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Farmer -> Buyer Matching: Find relevant buyers and sourcing requirements' })
  @ApiResponse({ status: 200, description: 'Ranked matched buyers with compatibility breakdown returned' })
  async matchBuyers(
    @Body() dto: MatchBuyersDto,
    @CurrentUser() _user: AuthUser,
  ) {
    return this.aiService.matchBuyers(dto);
  }

  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles(Role.BUYER, Role.ADMIN)
  @Post('matching/sellers')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Buyer -> Seller Matching: Find compatible seller catalog products' })
  @ApiResponse({ status: 200, description: 'Ranked matched seller products with explainable reasons returned' })
  async matchSellers(
    @Body() dto: MatchSellersDto,
    @CurrentUser() _user: AuthUser,
  ) {
    return this.aiService.matchSellers(dto);
  }
}


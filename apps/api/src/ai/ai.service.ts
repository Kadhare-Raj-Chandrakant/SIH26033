import {
  Injectable,
  Logger,
  ServiceUnavailableException,
  GatewayTimeoutException,
  InternalServerErrorException,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service.js';
import { PredictPriceDto } from './dto/predict-price.dto.js';
import { ForecastDemandDto } from './dto/forecast-demand.dto.js';
import { RecommendCropDto } from './dto/recommend-crop.dto.js';
import { RecordFeedbackDto } from './dto/record-feedback.dto.js';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly aiServiceUrl: string;
  private readonly timeoutMs: number;
  private readonly internalKey: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.aiServiceUrl = this.configService.get<string>(
      'AI_SERVICE_URL',
      'http://localhost:8080',
    );
    this.timeoutMs = this.configService.get<number>('AI_TIMEOUT_MS', 5000);
    this.internalKey = this.configService.get<string>(
      'AI_INTERNAL_KEY',
      'sih26033_internal_ai_token_secret',
    );
  }

  /**
   * Health and readiness checks for AI service
   */
  async checkHealth(): Promise<Record<string, any>> {
    return this.callAiEndpoint('/health', 'GET');
  }

  async checkReadiness(): Promise<Record<string, any>> {
    return this.callAiEndpoint('/ready', 'GET');
  }

  /**
   * Predict baseline commodity modal price
   */
  async predictPrice(
    dto: PredictPriceDto,
    userId?: string,
  ): Promise<Record<string, any>> {
    const payload = {
      commodity: dto.commodity,
      market: dto.market ?? 'Azadpur',
      district: dto.district,
      state: dto.state,
      target_date: dto.targetDate,
      historical_price_lag_1: dto.historicalPriceLag1,
      historical_price_lag_7: dto.historicalPriceLag7,
      historical_price_rolling_7: dto.historicalPriceRolling7,
      arrivals_lag_1: dto.arrivalsLag1,
    };

    const response = await this.callAiEndpoint(
      '/api/v1/predict/price',
      'POST',
      payload,
    );

    // Asynchronously log prediction in database for the feedback loop
    this.logPrediction(
      'price_predictor_baseline',
      response.model_version || '1.0.0',
      payload,
      response,
      userId,
    ).catch((err) =>
      this.logger.warn(`Failed to persist AI prediction log: ${err.message}`),
    );

    return response;
  }

  /**
   * Forecast market absorption / demand proxy
   */
  async forecastDemand(
    dto: ForecastDemandDto,
    userId?: string,
  ): Promise<Record<string, any>> {
    const payload = {
      commodity: dto.commodity,
      market: dto.market ?? 'Azadpur',
      target_date: dto.targetDate,
      arrivals_lag_1: dto.arrivalsLag1,
      arrivals_rolling_mean_7: dto.arrivalsRollingMean7,
      historical_price_lag_1: dto.historicalPriceLag1,
    };

    const response = await this.callAiEndpoint(
      '/api/v1/predict/demand',
      'POST',
      payload,
    );

    this.logPrediction(
      'demand_forecaster_baseline',
      response.model_version || '1.0.0',
      payload,
      response,
      userId,
    ).catch((err) =>
      this.logger.warn(`Failed to persist AI prediction log: ${err.message}`),
    );

    return response;
  }

  /**
   * Recommend crops given soil and climatic parameters
   */
  async recommendCrop(
    dto: RecommendCropDto,
    userId?: string,
  ): Promise<Record<string, any>> {
    const payload = {
      N: dto.N,
      P: dto.P,
      K: dto.K,
      temperature: dto.temperature,
      humidity: dto.humidity,
      ph: dto.ph,
      rainfall: dto.rainfall,
      top_k: dto.topK ?? 3,
    };

    const response = await this.callAiEndpoint(
      '/api/v1/predict/crop',
      'POST',
      payload,
    );

    this.logPrediction(
      'crop_recommender_baseline',
      response.model_version || '1.0.0',
      payload,
      response,
      userId,
    ).catch((err) =>
      this.logger.warn(`Failed to persist AI prediction log: ${err.message}`),
    );

    return response;
  }

  /**
   * Record ground-truth transaction outcome or user decision to close the feedback loop
   */
  async recordFeedback(
    dto: RecordFeedbackDto,
    userId?: string,
  ): Promise<Record<string, any>> {
    const payload = {
      model_name: dto.modelName,
      model_version: dto.modelVersion,
      prediction_id: dto.predictionId,
      features_logged: dto.featuresLogged,
      prediction_output: dto.predictionOutput,
      actual_outcome: dto.actualOutcome,
      user_decision: dto.userDecision,
    };

    // If predictionId matches an existing database log, validate ownership first
    if (dto.predictionId) {
      const existing = await this.prisma.aiPredictionLog.findUnique({
        where: { id: dto.predictionId },
      });
      if (!existing) {
        throw new NotFoundException('Prediction record not found');
      }
      if (existing.userId && existing.userId !== userId) {
        throw new ForbiddenException(
          'You are not authorized to update another user prediction record',
        );
      }
    }

    // Forward to FastAPI feedback store
    const aiResponse = await this.callAiEndpoint(
      '/api/v1/feedback/record',
      'POST',
      payload,
    );

    if (dto.predictionId) {
      await this.prisma.aiPredictionLog.update({
        where: { id: dto.predictionId },
        data: {
          actualOutcome: dto.actualOutcome ?? undefined,
          userDecision: dto.userDecision ?? undefined,
        },
      });
    } else {
      // Create new observation record
      await this.prisma.aiPredictionLog.create({
        data: {
          modelName: dto.modelName,
          modelVersion: dto.modelVersion,
          userId: userId ?? null,
          inputFeatures: dto.featuresLogged,
          predictionOutput: dto.predictionOutput,
          actualOutcome: dto.actualOutcome ?? undefined,
          userDecision: dto.userDecision ?? undefined,
        },
      });
    }

    return aiResponse;
  }

  /**
   * Retrieve recent prediction audit logs
   */
  async getRecentPredictions(limit: number = 20, userId?: string) {
    const take = Math.min(Math.max(1, limit), 100);
    return this.prisma.aiPredictionLog.findMany({
      where: userId ? { userId } : undefined,
      take,
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Internal resilient HTTP dispatcher to FastAPI AI service
   */
  private async callAiEndpoint(
    path: string,
    method: 'GET' | 'POST',
    body?: any,
  ): Promise<any> {
    const targetUrl = `${this.aiServiceUrl.replace(/\/$/, '')}${path}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'x-internal-api-key': this.internalKey,
      };

      const fetchOptions: RequestInit = {
        method,
        headers,
        signal: controller.signal,
      };

      if (method !== 'GET' && body !== undefined) {
        fetchOptions.body = JSON.stringify(body);
      }

      const response = await fetch(targetUrl, fetchOptions);

      if (!response.ok) {
        let errorBody: any;
        try {
          errorBody = await response.json();
        } catch {
          errorBody = { message: response.statusText };
        }

        const msg =
          errorBody?.error?.message ||
          errorBody?.message ||
          `AI service returned status ${response.status}`;

        if (response.status === 422) {
          throw new BadRequestException(msg);
        } else if (response.status === 503) {
          throw new ServiceUnavailableException(msg);
        } else {
          throw new InternalServerErrorException(msg);
        }
      }

      return await response.json();
    } catch (err: any) {
      if (err.name === 'AbortError') {
        this.logger.error(
          `AI Service request timeout after ${this.timeoutMs}ms on ${path}`,
        );
        throw new GatewayTimeoutException(
          'AI service timed out while processing request',
        );
      }
      if (
        err instanceof BadRequestException ||
        err instanceof ServiceUnavailableException ||
        err instanceof InternalServerErrorException ||
        err instanceof GatewayTimeoutException
      ) {
        throw err;
      }
      this.logger.error(
        `Failed to reach AI service at ${targetUrl}: ${err.message}`,
      );
      throw new ServiceUnavailableException(
        'AI intelligence service is currently unavailable',
      );
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private async logPrediction(
    modelName: string,
    modelVersion: string,
    inputFeatures: any,
    predictionOutput: any,
    userId?: string,
  ) {
    try {
      await this.prisma.aiPredictionLog.create({
        data: {
          modelName,
          modelVersion,
          userId: userId ?? null,
          inputFeatures,
          predictionOutput,
        },
      });
    } catch (err: any) {
      this.logger.warn(`Could not log AI prediction: ${err.message}`);
    }
  }
}

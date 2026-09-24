import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { LogisticsService } from './logistics.service.js';
import { GetRouteDto } from './dto/get-route.dto.js';
import { Public } from '../common/decorators/public.decorator.js';

@ApiTags('Logistics')
@Controller('logistics')
export class LogisticsController {
  constructor(private readonly logisticsService: LogisticsService) {}

  @Public()
  @Get('route')
  @ApiOperation({
    summary: 'Get transit route geometry between farm/mandi origin and destination',
    description:
      'Resolves transit route using OSRM with 24-hour in-memory caching and synthetic 7-point highway arc fallback.',
  })
  @ApiResponse({
    status: 200,
    description: 'GeoJSON LineString route with distance and duration.',
  })
  async getRoute(@Query() query: GetRouteDto) {
    return this.logisticsService.getRoute(query);
  }
}

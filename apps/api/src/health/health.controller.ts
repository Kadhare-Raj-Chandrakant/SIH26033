import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HealthCheckService, PrismaHealthIndicator } from '@nestjs/terminus';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service.js';
import { Public } from '../common/decorators/public.decorator.js';

@ApiTags('Health')
@Controller('health')
@Public()
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private prismaHealth: PrismaHealthIndicator,
    private prismaService: PrismaService,
  ) {}

  @Get()
  @HealthCheck()
  @ApiOperation({ summary: 'Check API Liveness and Database Readiness' })
  check() {
    return this.health.check([
      // Only do a simple ping to ensure the DB connection is alive
      () => this.prismaHealth.pingCheck('database', this.prismaService),
    ]);
  }

  @Get('readiness')
  @HealthCheck()
  @ApiOperation({ summary: 'Check Database and Core Dependency Readiness' })
  checkReadiness() {
    return this.health.check([
      () => this.prismaHealth.pingCheck('database', this.prismaService),
    ]);
  }

  @Get('liveness')
  @ApiOperation({ summary: 'Check Process Liveness' })
  checkLiveness() {
    return {
      status: 'ok',
      service: 'api',
      timestamp: new Date().toISOString(),
    };
  }
}

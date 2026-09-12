import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AdminService } from './admin.service.js';
import { CreateReportDto } from './dto/create-report.dto.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { AuthUser } from '../common/decorators/current-user.decorator.js';

@ApiTags('reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly adminService: AdminService) {}

  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post()
  @ApiOperation({ summary: 'Submit a report or flag for a user, product, order, or seller' })
  @ApiResponse({ status: 201, description: 'Report submitted successfully.' })
  async createReport(
    @Body() dto: CreateReportDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.adminService.createReport(dto, user.sub);
  }
}

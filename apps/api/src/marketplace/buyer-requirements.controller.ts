import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { BuyerRequirementsService } from './buyer-requirements.service.js';
import { CreateBuyerRequirementDto } from './dto/create-buyer-requirement.dto.js';
import { CurrentUser, type AuthUser } from '../common/decorators/current-user.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Role } from '@prisma/client';
import { Public } from '../common/decorators/public.decorator.js';

@ApiTags('Buyer Sourcing Requirements')
@Controller()
export class BuyerRequirementsController {
  constructor(private readonly service: BuyerRequirementsService) {}

  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles(Role.BUYER, Role.ADMIN)
  @Post('buyer/requirements')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Post a new buyer procurement / sourcing requirement' })
  @ApiResponse({ status: 201, description: 'Requirement successfully posted' })
  async createRequirement(
    @Body() dto: CreateBuyerRequirementDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.createRequirement(user.sub, dto);
  }

  @ApiBearerAuth()
  @Get('buyer/requirements/my')
  @ApiOperation({ summary: 'List current buyer procurement requirements' })
  @ApiResponse({ status: 200, description: 'List of posted requirements' })
  async getMyRequirements(@CurrentUser() user: AuthUser) {
    return this.service.getMyRequirements(user.sub);
  }

  @Public()
  @Get('marketplace/buyer-requirements')
  @ApiOperation({ summary: 'List open buyer requirements for farmers and sellers to fulfill' })
  @ApiResponse({ status: 200, description: 'List of open requirements' })
  async getOpenRequirements(
    @Query('commodity') commodity?: string,
    @Query('limit') limit?: number,
  ) {
    return this.service.getOpenRequirements(commodity, limit ? Number(limit) : 20);
  }

  @ApiBearerAuth()
  @Patch('buyer/requirements/:id/status')
  @ApiOperation({ summary: 'Update status of buyer requirement (e.g. FULFILLED, CANCELLED)' })
  @ApiResponse({ status: 200, description: 'Status updated' })
  async updateStatus(
    @Param('id') id: string,
    @Body('status') status: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.updateStatus(user.sub, id, status);
  }
}

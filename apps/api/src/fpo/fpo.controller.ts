import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { FpoService } from './fpo.service.js';
import { RegisterFpoDto } from './dto/register-fpo.dto.js';
import { JoinFpoDto } from './dto/join-fpo.dto.js';
import { CommitListingDto } from './dto/commit-listing.dto.js';
import { CreateBatchDto } from './dto/create-batch.dto.js';
import { PostBuyRequestDto } from './dto/post-buy-request.dto.js';
import { CreateSettlementDto } from './dto/create-settlement.dto.js';
import { MatchBatchDto } from './dto/match-batch.dto.js';
import { ApproveMembershipDto } from './dto/approve-membership.dto.js';
import { VerifyFpoDto } from './dto/verify-fpo.dto.js';
import {
  FpoFilterDto,
  FpoListingFilterDto,
  BuyRequestFilterDto,
} from './dto/fpo-query.dto.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { Public } from '../common/decorators/public.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { AuthUser } from '../common/decorators/current-user.decorator.js';
import { Role, FpoStatus, FpoMembershipStatus, FpoBatchStatus } from '@prisma/client';

@ApiTags('FPO')
@Controller('fpo')
export class FpoController {
  constructor(private readonly fpoService: FpoService) {}

  // ===========================================================================
  // 1. PUBLIC & DIRECTORY ENDPOINTS
  // ===========================================================================

  @Public()
  @Get()
  @ApiOperation({ summary: 'List verified active FPOs with state, district, or commodity filters' })
  @ApiResponse({ status: 200, description: 'List of active FPOs retrieved successfully.' })
  async listFpos(@Query() filters: FpoFilterDto) {
    return this.fpoService.listFpos(filters);
  }

  // ===========================================================================
  // 2. BUYER BULK PROCUREMENT (Declared before :id)
  // ===========================================================================

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.BUYER, Role.FPO, Role.ADMIN)
  @Post('buy-requests')
  @ApiOperation({ summary: 'Post an institutional bulk procurement buy request (Buyer / FPO)' })
  @ApiResponse({ status: 201, description: 'Bulk buy request posted successfully.' })
  async postBuyRequest(
    @CurrentUser() user: AuthUser,
    @Body() dto: PostBuyRequestDto,
  ) {
    return this.fpoService.postBuyRequest(user.sub, dto);
  }

  @Public()
  @Get('buy-requests/all')
  @ApiOperation({ summary: 'List all open institutional bulk procurement requests (Public)' })
  @ApiResponse({ status: 200, description: 'List of buy requests.' })
  async listBuyRequests(@Query() filters: BuyRequestFilterDto) {
    return this.fpoService.listBuyRequests(filters);
  }

  // ===========================================================================
  // 3. FARMER CONTEXT ENDPOINTS (Declared before :id)
  // ===========================================================================

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.FARMER, Role.ADMIN)
  @Get('farmer/my-listings')
  @ApiOperation({ summary: 'Get all produce commitments submitted by authenticated farmer' })
  @ApiResponse({ status: 200, description: 'Farmer listings retrieved successfully.' })
  async getMyListings(@CurrentUser() user: AuthUser) {
    return this.fpoService.getFarmerListings(user.sub);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.FARMER, Role.ADMIN)
  @Get('farmer/my-memberships')
  @ApiOperation({ summary: 'Get all FPO memberships for authenticated farmer' })
  @ApiResponse({ status: 200, description: 'Farmer memberships list.' })
  async getMyMemberships(@CurrentUser() user: AuthUser) {
    return this.fpoService.getFarmerMemberships(user.sub);
  }

  // ===========================================================================
  // 4. FPO ADMIN SPECIFIC ACTIONS (Declared before :id)
  // ===========================================================================

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.FPO, Role.ADMIN)
  @Get('my-organization')
  @ApiOperation({ summary: 'Get the FPO organization registered/managed by authenticated user' })
  @ApiResponse({ status: 200, description: 'Managed FPO organization.' })
  async getMyOrganization(@CurrentUser() user: AuthUser) {
    return this.fpoService.getFpoByAdminUserId(user.sub);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.FPO, Role.ADMIN)
  @Post('register')
  @ApiOperation({ summary: 'Register a new FPO organization (FPO, ADMIN)' })
  @ApiResponse({ status: 201, description: 'FPO organization submitted for accreditation.' })
  async register(
    @CurrentUser() user: AuthUser,
    @Body() dto: RegisterFpoDto,
  ) {
    return this.fpoService.registerFpo(user.sub, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.FPO, Role.ADMIN)
  @Patch('memberships/:id/approve')
  @ApiOperation({ summary: 'Approve or decline a farmer membership application (FPO Admin)' })
  @ApiResponse({ status: 200, description: 'Membership status updated.' })
  async approveMembership(
    @CurrentUser() user: AuthUser,
    @Param('id') membershipId: string,
    @Body() dto: ApproveMembershipDto,
  ) {
    return this.fpoService.approveMembership(user.sub, membershipId, dto.approve, dto.reason);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.FPO, Role.ADMIN)
  @Patch('batches/:batchId/seal')
  @ApiOperation({ summary: 'Seal an aggregated lot batch to freeze volume for matching' })
  @ApiResponse({ status: 200, description: 'Batch sealed successfully.' })
  async sealBatch(
    @CurrentUser() user: AuthUser,
    @Param('batchId') batchId: string,
  ) {
    return this.fpoService.sealBatch(user.sub, batchId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.FPO, Role.ADMIN)
  @Post('batches/:batchId/match')
  @ApiOperation({ summary: 'Match sealed FPO batch to institutional buyer request, create bulk Order' })
  @ApiResponse({ status: 200, description: 'Batch matched and dispatched; Order created.' })
  async matchBatch(
    @CurrentUser() user: AuthUser,
    @Param('batchId') batchId: string,
    @Body() dto: MatchBatchDto,
  ) {
    return this.fpoService.matchBatchToRequest(user.sub, batchId, dto.buyRequestId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.FPO, Role.ADMIN)
  @Post('batches/:batchId/settlement')
  @ApiOperation({ summary: 'Generate proportional settlement statement for delivered batch' })
  @ApiResponse({ status: 201, description: 'Settlement created successfully.' })
  async createSettlement(
    @CurrentUser() user: AuthUser,
    @Param('batchId') batchId: string,
    @Body() dto: CreateSettlementDto,
  ) {
    return this.fpoService.createSettlement(user.sub, batchId, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.FPO, Role.ADMIN)
  @Post('settlements/:id/distribute')
  @ApiOperation({ summary: 'Distribute net proportional proceeds to all participating member farmers' })
  @ApiResponse({ status: 200, description: 'Settlement disbursed; payments marked DISTRIBUTED.' })
  async distributePayments(
    @CurrentUser() user: AuthUser,
    @Param('id') settlementId: string,
  ) {
    return this.fpoService.distributePayments(user.sub, settlementId);
  }

  // ===========================================================================
  // 5. PLATFORM ADMIN ACCREDITATION (Declared before :id)
  // ===========================================================================

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Get('admin/all')
  @ApiOperation({ summary: 'List all FPO organizations including pending accreditation (Platform Admin)' })
  @ApiResponse({ status: 200, description: 'Full FPO catalog for platform moderation.' })
  async getAllFposForAdmin(@Query('status') status?: FpoStatus) {
    return this.fpoService.listFpos({ status: status || undefined });
  }

  // ===========================================================================
  // 6. PARAMETERIZED FPO ROUTES (:id)
  // ===========================================================================

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get public FPO profile by ID with member and commodity metrics' })
  @ApiResponse({ status: 200, description: 'FPO organization profile.' })
  async getFpo(@Param('id') id: string) {
    return this.fpoService.getFpoById(id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Patch(':id/verify')
  @ApiOperation({ summary: 'Approve, reject, or suspend FPO accreditation (Platform Admin only)' })
  @ApiResponse({ status: 200, description: 'FPO verification status updated.' })
  async verifyFpo(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: VerifyFpoDto,
  ) {
    return this.fpoService.verifyFpo(user.sub, id, dto.status, dto.reason);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.FARMER, Role.ADMIN)
  @Post(':id/join')
  @ApiOperation({ summary: 'Farmer requests membership in target FPO (FARMER role)' })
  @ApiResponse({ status: 201, description: 'Membership application submitted.' })
  async requestMembership(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: JoinFpoDto,
  ) {
    return this.fpoService.requestMembership(user.sub, id, dto.shareCapital);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.FARMER, Role.ADMIN)
  @Post(':id/listings')
  @ApiOperation({ summary: 'Farmer commits produce to target FPO (Must be approved member)' })
  @ApiResponse({ status: 201, description: 'Produce commitment recorded.' })
  async commitListing(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: CommitListingDto,
  ) {
    return this.fpoService.commitListing(user.sub, id, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.FPO, Role.ADMIN)
  @Get(':id/dashboard')
  @ApiOperation({ summary: 'Get FPO operational dashboard KPI statistics' })
  @ApiResponse({ status: 200, description: 'Dashboard metrics.' })
  async getDashboard(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ) {
    return this.fpoService.getDashboardStats(user.sub, id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.FPO, Role.ADMIN)
  @Get(':id/members')
  @ApiOperation({ summary: 'List members and pending membership applications for FPO' })
  @ApiResponse({ status: 200, description: 'Member roster.' })
  async getMembers(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Query('status') status?: FpoMembershipStatus,
  ) {
    return this.fpoService.getFpoMembers(user.sub, id, status);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.FPO, Role.ADMIN)
  @Get(':id/listings')
  @ApiOperation({ summary: 'List all farmer produce commitments submitted to this FPO' })
  @ApiResponse({ status: 200, description: 'Listings retrieved successfully.' })
  async getFpoListings(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Query() query: FpoListingFilterDto,
  ) {
    return this.fpoService.getFpoListings(user.sub, id, query);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.FPO, Role.ADMIN)
  @Post(':id/batches')
  @ApiOperation({ summary: 'Aggregate selected committed listings into an open lot batch' })
  @ApiResponse({ status: 201, description: 'Batch created successfully.' })
  async createBatch(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: CreateBatchDto,
  ) {
    return this.fpoService.createBatch(user.sub, id, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.FPO, Role.ADMIN)
  @Get(':id/batches')
  @ApiOperation({ summary: 'List all aggregation batches for this FPO' })
  @ApiResponse({ status: 200, description: 'Batches list.' })
  async getBatches(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Query('status') status?: FpoBatchStatus,
  ) {
    return this.fpoService.getFpoBatches(user.sub, id, status);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.FPO, Role.ADMIN)
  @Get(':id/matched-batches')
  @ApiOperation({ summary: 'Retrieve algorithmically matched buyer procurement requests for sealed batches' })
  @ApiResponse({ status: 200, description: 'Matched batches list.' })
  async getMatchedBatches(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ) {
    return this.fpoService.getMatchedBatches(user.sub, id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.FPO, Role.ADMIN)
  @Get(':id/settlements')
  @ApiOperation({ summary: 'List all settlements generated for this FPO' })
  @ApiResponse({ status: 200, description: 'Settlements list.' })
  async getSettlements(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ) {
    return this.fpoService.getFpoSettlements(user.sub, id);
  }
}

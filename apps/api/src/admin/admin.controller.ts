import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AdminService } from './admin.service.js';
import { AuditLogService } from './audit-log.service.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { AuthUser } from '../common/decorators/current-user.decorator.js';
import {
  AdminUserQueryDto,
  AdminSellerQueryDto,
  AdminProductQueryDto,
  AdminOrderQueryDto,
  AdminPaymentQueryDto,
  AdminShipmentQueryDto,
  AdminReportQueryDto,
  AdminAuditLogQueryDto,
} from './dto/admin-query.dto.js';
import { UpdateUserStatusDto } from './dto/update-user-status.dto.js';
import { VerifySellerDto } from './dto/verify-seller.dto.js';
import { ModerateProductDto } from './dto/moderate-product.dto.js';
import { ReviewReportDto } from './dto/review-report.dto.js';
import { Role } from '@prisma/client';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('admin')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly auditLogService: AuditLogService,
  ) {}

  // ---------------------------------------------------------------------------
  // DASHBOARD
  // ---------------------------------------------------------------------------

  @Get('dashboard')
  @ApiOperation({ summary: 'Get aggregated operational metrics for the admin dashboard' })
  @ApiResponse({ status: 200, description: 'Operational dashboard metrics.' })
  async getDashboard() {
    return this.adminService.getDashboard();
  }

  // ---------------------------------------------------------------------------
  // USERS
  // ---------------------------------------------------------------------------

  @Get('users')
  @ApiOperation({ summary: 'List and filter users with pagination and search' })
  @ApiResponse({ status: 200, description: 'Paginated user list.' })
  async getUsers(@Query() query: AdminUserQueryDto) {
    return this.adminService.getUsers(query);
  }

  @Get('users/:id')
  @ApiOperation({ summary: 'Get details of a single user' })
  @ApiResponse({ status: 200, description: 'User details.' })
  @ApiResponse({ status: 404, description: 'User not found.' })
  async getUserById(@Param('id') id: string) {
    return this.adminService.getUserById(id);
  }

  @Patch('users/:id/status')
  @ApiOperation({ summary: 'Update user account status (ACTIVE, SUSPENDED, DEACTIVATED)' })
  @ApiResponse({ status: 200, description: 'User status updated successfully.' })
  async updateUserStatus(
    @Param('id') id: string,
    @Body() dto: UpdateUserStatusDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.adminService.updateUserStatus(id, dto, user.sub);
  }

  // ---------------------------------------------------------------------------
  // SELLERS / FARMERS / FPOS
  // ---------------------------------------------------------------------------

  @Get('sellers')
  @ApiOperation({ summary: 'List sellers and FPOs with filters' })
  @ApiResponse({ status: 200, description: 'Paginated seller list.' })
  async getSellers(@Query() query: AdminSellerQueryDto) {
    return this.adminService.getSellers(query);
  }

  @Get('sellers/:id')
  @ApiOperation({ summary: 'Get details of a seller profile' })
  @ApiResponse({ status: 200, description: 'Seller profile details.' })
  @ApiResponse({ status: 404, description: 'Seller profile not found.' })
  async getSellerById(@Param('id') id: string) {
    return this.adminService.getSellerById(id);
  }

  @Patch('sellers/:id/verify')
  @ApiOperation({ summary: 'Update verification status of a seller/FPO' })
  @ApiResponse({ status: 200, description: 'Seller verification status updated.' })
  async verifySeller(
    @Param('id') id: string,
    @Body() dto: VerifySellerDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.adminService.verifySeller(id, dto, user.sub);
  }

  // ---------------------------------------------------------------------------
  // PRODUCTS / LISTINGS
  // ---------------------------------------------------------------------------

  @Get('products')
  @ApiOperation({ summary: 'List and filter marketplace products' })
  @ApiResponse({ status: 200, description: 'Paginated product list.' })
  async getProducts(@Query() query: AdminProductQueryDto) {
    return this.adminService.getProducts(query);
  }

  @Get('products/:id')
  @ApiOperation({ summary: 'Get details of a marketplace product' })
  @ApiResponse({ status: 200, description: 'Product details.' })
  @ApiResponse({ status: 404, description: 'Product not found.' })
  async getProductById(@Param('id') id: string) {
    return this.adminService.getProductById(id);
  }

  @Patch('products/:id/moderate')
  @ApiOperation({ summary: 'Moderate product status (ACTIVE, OUT_OF_STOCK, ARCHIVED, REJECTED)' })
  @ApiResponse({ status: 200, description: 'Product moderation status updated.' })
  async moderateProduct(
    @Param('id') id: string,
    @Body() dto: ModerateProductDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.adminService.moderateProduct(id, dto, user.sub);
  }

  // ---------------------------------------------------------------------------
  // ORDERS
  // ---------------------------------------------------------------------------

  @Get('orders')
  @ApiOperation({ summary: 'List and filter orders' })
  @ApiResponse({ status: 200, description: 'Paginated order list.' })
  async getOrders(@Query() query: AdminOrderQueryDto) {
    return this.adminService.getOrders(query);
  }

  @Get('orders/:id')
  @ApiOperation({ summary: 'Get full details of an order' })
  @ApiResponse({ status: 200, description: 'Order details.' })
  @ApiResponse({ status: 404, description: 'Order not found.' })
  async getOrderById(@Param('id') id: string) {
    return this.adminService.getOrderById(id);
  }

  // ---------------------------------------------------------------------------
  // PAYMENTS
  // ---------------------------------------------------------------------------

  @Get('payments')
  @ApiOperation({ summary: 'List and filter payments with safe projections' })
  @ApiResponse({ status: 200, description: 'Paginated payment list.' })
  async getPayments(@Query() query: AdminPaymentQueryDto) {
    return this.adminService.getPayments(query);
  }

  // ---------------------------------------------------------------------------
  // LOGISTICS / SHIPMENTS
  // ---------------------------------------------------------------------------

  @Get('shipments')
  @ApiOperation({ summary: 'List and filter shipments' })
  @ApiResponse({ status: 200, description: 'Paginated shipment list.' })
  async getShipments(@Query() query: AdminShipmentQueryDto) {
    return this.adminService.getShipments(query);
  }

  @Get('shipments/:id')
  @ApiOperation({ summary: 'Get shipment details and tracking timeline' })
  @ApiResponse({ status: 200, description: 'Shipment details.' })
  @ApiResponse({ status: 404, description: 'Shipment not found.' })
  async getShipmentById(@Param('id') id: string) {
    return this.adminService.getShipmentById(id);
  }

  // ---------------------------------------------------------------------------
  // REPORTS & MODERATION QUEUE
  // ---------------------------------------------------------------------------

  @Get('reports')
  @ApiOperation({ summary: 'List and filter moderation reports' })
  @ApiResponse({ status: 200, description: 'Paginated moderation reports.' })
  async getReports(@Query() query: AdminReportQueryDto) {
    return this.adminService.getReports(query);
  }

  @Get('reports/:id')
  @ApiOperation({ summary: 'Get moderation report details' })
  @ApiResponse({ status: 200, description: 'Moderation report details.' })
  @ApiResponse({ status: 404, description: 'Report not found.' })
  async getReportById(@Param('id') id: string) {
    return this.adminService.getReportById(id);
  }

  @Patch('reports/:id')
  @ApiOperation({ summary: 'Review, resolve, or dismiss a moderation report' })
  @ApiResponse({ status: 200, description: 'Report reviewed successfully.' })
  async reviewReport(
    @Param('id') id: string,
    @Body() dto: ReviewReportDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.adminService.reviewReport(id, dto, user.sub);
  }

  // ---------------------------------------------------------------------------
  // AUDIT LOGS
  // ---------------------------------------------------------------------------

  @Get('audit-logs')
  @ApiOperation({ summary: 'Browse append-only administrative audit records' })
  @ApiResponse({ status: 200, description: 'Paginated audit log entries.' })
  async getAuditLogs(@Query() query: AdminAuditLogQueryDto) {
    return this.auditLogService.findAll(query);
  }
}

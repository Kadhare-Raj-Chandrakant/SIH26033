import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuditLogService } from './audit-log.service.js';
import {
  AdminUserQueryDto,
  AdminSellerQueryDto,
  AdminProductQueryDto,
  AdminOrderQueryDto,
  AdminPaymentQueryDto,
  AdminShipmentQueryDto,
  AdminReportQueryDto,
} from './dto/admin-query.dto.js';
import { UpdateUserStatusDto } from './dto/update-user-status.dto.js';
import { VerifySellerDto } from './dto/verify-seller.dto.js';
import { ModerateProductDto } from './dto/moderate-product.dto.js';
import { CreateReportDto } from './dto/create-report.dto.js';
import { ReviewReportDto } from './dto/review-report.dto.js';
import { Prisma, ProductStatus } from '@prisma/client';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
  ) {}

  // ---------------------------------------------------------------------------
  // 1. DASHBOARD AGGREGATIONS
  // ---------------------------------------------------------------------------

  async getDashboard() {
    const [
      totalUsers,
      farmers,
      fpos,
      buyers,
      admins,
      activeUsers,
      suspendedUsers,
      deactivatedUsers,
      totalProducts,
      activeProducts,
      outOfStockProducts,
      archivedProducts,
      rejectedProducts,
      totalCategories,
      totalSellers,
      verifiedSellers,
      totalOrders,
      orderStatusCounts,
      orderTotalAgg,
      totalPayments,
      paymentStatusCounts,
      paymentCompletedAgg,
      totalShipments,
      shipmentStatusCounts,
      openReports,
      underReviewReports,
      resolvedReports,
      dismissedReports,
      recentAuditLogs,
    ] = await Promise.all([
      // Users
      this.prisma.user.count(),
      this.prisma.user.count({ where: { role: 'FARMER' } }),
      this.prisma.user.count({ where: { role: 'FPO' } }),
      this.prisma.user.count({ where: { role: 'BUYER' } }),
      this.prisma.user.count({ where: { role: 'ADMIN' } }),
      this.prisma.user.count({ where: { status: 'ACTIVE' } }),
      this.prisma.user.count({ where: { status: 'SUSPENDED' } }),
      this.prisma.user.count({ where: { status: 'DEACTIVATED' } }),

      // Products
      this.prisma.product.count(),
      this.prisma.product.count({ where: { status: 'ACTIVE' } }),
      this.prisma.product.count({ where: { status: 'OUT_OF_STOCK' } }),
      this.prisma.product.count({ where: { status: 'ARCHIVED' } }),
      this.prisma.product.count({ where: { status: 'REJECTED' } }),
      this.prisma.category.count(),
      this.prisma.sellerProfile.count(),
      this.prisma.sellerProfile.count({ where: { verificationStatus: 'VERIFIED' } }),

      // Orders
      this.prisma.order.count(),
      this.prisma.order.groupBy({
        by: ['status'],
        _count: { id: true },
      }),
      this.prisma.order.aggregate({
        _sum: { totalAmount: true },
      }),

      // Payments
      this.prisma.payment.count(),
      this.prisma.payment.groupBy({
        by: ['status'],
        _count: { id: true },
      }),
      this.prisma.payment.aggregate({
        where: { status: 'COMPLETED' },
        _sum: { amount: true },
      }),

      // Logistics
      this.prisma.shipment.count(),
      this.prisma.shipment.groupBy({
        by: ['status'],
        _count: { id: true },
      }),

      // Reports & Moderation
      this.prisma.moderationReport.count({ where: { status: 'OPEN' } }),
      this.prisma.moderationReport.count({ where: { status: 'UNDER_REVIEW' } }),
      this.prisma.moderationReport.count({ where: { status: 'RESOLVED' } }),
      this.prisma.moderationReport.count({ where: { status: 'DISMISSED' } }),

      // Recent 5 audit logs for activity preview
      this.prisma.auditLog.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          actor: {
            select: { id: true, email: true, role: true },
          },
        },
      }),
    ]);

    // Format grouped counts into dictionary maps
    const ordersByStatus: Record<string, number> = {};
    for (const item of orderStatusCounts) {
      ordersByStatus[item.status] = item._count.id;
    }

    const paymentsByStatus: Record<string, number> = {};
    for (const item of paymentStatusCounts) {
      paymentsByStatus[item.status] = item._count.id;
    }

    const shipmentsByStatus: Record<string, number> = {};
    for (const item of shipmentStatusCounts) {
      shipmentsByStatus[item.status] = item._count.id;
    }

    return {
      users: {
        total: totalUsers,
        farmers,
        fpos,
        buyers,
        admins,
        active: activeUsers,
        suspended: suspendedUsers,
        deactivated: deactivatedUsers,
      },
      marketplace: {
        totalProducts,
        active: activeProducts,
        outOfStock: outOfStockProducts,
        archived: archivedProducts,
        rejected: rejectedProducts,
        categories: totalCategories,
        totalSellers,
        verifiedSellers,
      },
      orders: {
        total: totalOrders,
        byStatus: ordersByStatus,
        totalVolume: orderTotalAgg._sum.totalAmount ? Number(orderTotalAgg._sum.totalAmount) : 0,
      },
      payments: {
        total: totalPayments,
        byStatus: paymentsByStatus,
        totalSettledAmount: paymentCompletedAgg._sum.amount ? Number(paymentCompletedAgg._sum.amount) : 0,
      },
      logistics: {
        totalShipments,
        byStatus: shipmentsByStatus,
      },
      moderation: {
        pendingReports: openReports + underReviewReports,
        openReports,
        underReviewReports,
        resolvedReports,
        dismissedReports,
        rejectedProducts,
      },
      recentActivity: recentAuditLogs,
    };
  }

  // ---------------------------------------------------------------------------
  // 2. USER MANAGEMENT
  // ---------------------------------------------------------------------------

  async getUsers(query: AdminUserQueryDto) {
    const page = Number(query.page) || 1;
    const limit = Math.min(Number(query.limit) || 10, 100);
    const skip = (page - 1) * limit;

    const where: Prisma.UserWhereInput = {};

    if (query.role) {
      where.role = query.role;
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.search?.trim()) {
      const s = query.search.trim();
      where.OR = [
        { email: { contains: s, mode: 'insensitive' } },
        { mobile: { contains: s } },
      ];
    }

    const [total, users] = await Promise.all([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: query.sortOrder || 'desc' },
        select: {
          id: true,
          email: true,
          mobile: true,
          role: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          sellerProfile: {
            select: {
              id: true,
              sellerType: true,
              businessName: true,
              verificationStatus: true,
              farmLocation: true,
            },
          },
          buyerProfile: {
            select: {
              id: true,
              buyerType: true,
              businessName: true,
              verificationStatus: true,
            },
          },
        },
      }),
    ]);

    return {
      data: users,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async getUserById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        mobile: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        addresses: true,
        sellerProfile: {
          include: {
            _count: {
              select: {
                products: true,
                ordersReceived: true,
              },
            },
          },
        },
        buyerProfile: {
          include: {
            _count: {
              select: {
                ordersPlaced: true,
                reviews: true,
                buyerRequirements: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return user;
  }

  async updateUserStatus(id: string, dto: UpdateUserStatusDto, actorUserId: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    if (id === actorUserId && dto.status !== 'ACTIVE') {
      throw new BadRequestException('Administrators cannot suspend or deactivate their own account');
    }

    const previousStatus = user.status;
    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: { status: dto.status },
      select: {
        id: true,
        email: true,
        mobile: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    await this.auditLogService.logAction({
      actorUserId,
      action: 'USER_STATUS_UPDATE',
      entityType: 'USER',
      entityId: id,
      previousState: { status: previousStatus },
      newState: { status: dto.status },
      reason: dto.reason || `Status updated from ${previousStatus} to ${dto.status}`,
    });

    return updatedUser;
  }

  // ---------------------------------------------------------------------------
  // 3. SELLER / FARMER / FPO MANAGEMENT
  // ---------------------------------------------------------------------------

  async getSellers(query: AdminSellerQueryDto) {
    const page = Number(query.page) || 1;
    const limit = Math.min(Number(query.limit) || 10, 100);
    const skip = (page - 1) * limit;

    const where: Prisma.SellerProfileWhereInput = {};

    if (query.sellerType) {
      where.sellerType = query.sellerType;
    }

    if (query.verificationStatus?.trim()) {
      where.verificationStatus = query.verificationStatus.trim();
    }

    if (query.search?.trim()) {
      const s = query.search.trim();
      where.OR = [
        { businessName: { contains: s, mode: 'insensitive' } },
        { farmLocation: { contains: s, mode: 'insensitive' } },
        { user: { email: { contains: s, mode: 'insensitive' } } },
      ];
    }

    const [total, sellers] = await Promise.all([
      this.prisma.sellerProfile.count({ where }),
      this.prisma.sellerProfile.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: query.sortOrder || 'desc' },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              mobile: true,
              status: true,
              createdAt: true,
            },
          },
          _count: {
            select: {
              products: true,
              ordersReceived: true,
            },
          },
        },
      }),
    ]);

    return {
      data: sellers,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async getSellerById(id: string) {
    const seller = await this.prisma.sellerProfile.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            mobile: true,
            status: true,
            createdAt: true,
          },
        },
        products: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: {
            category: true,
            inventory: true,
            images: { take: 1 },
          },
        },
        _count: {
          select: {
            products: true,
            ordersReceived: true,
          },
        },
      },
    });

    if (!seller) {
      throw new NotFoundException(`Seller profile with ID ${id} not found`);
    }

    return seller;
  }

  async verifySeller(id: string, dto: VerifySellerDto, actorUserId: string) {
    const seller = await this.prisma.sellerProfile.findUnique({ where: { id } });
    if (!seller) {
      throw new NotFoundException(`Seller profile with ID ${id} not found`);
    }

    const previousStatus = seller.verificationStatus;
    const updatedSeller = await this.prisma.sellerProfile.update({
      where: { id },
      data: { verificationStatus: dto.verificationStatus },
      include: {
        user: {
          select: { id: true, email: true, role: true, status: true },
        },
      },
    });

    await this.auditLogService.logAction({
      actorUserId,
      action: 'SELLER_VERIFICATION',
      entityType: 'SELLER',
      entityId: id,
      previousState: { verificationStatus: previousStatus },
      newState: { verificationStatus: dto.verificationStatus },
      reason: dto.reason || `Verification status updated from ${previousStatus} to ${dto.verificationStatus}`,
    });

    return updatedSeller;
  }

  // ---------------------------------------------------------------------------
  // 4. PRODUCT / LISTING MODERATION
  // ---------------------------------------------------------------------------

  async getProducts(query: AdminProductQueryDto) {
    const page = Number(query.page) || 1;
    const limit = Math.min(Number(query.limit) || 10, 100);
    const skip = (page - 1) * limit;

    const where: Prisma.ProductWhereInput = {};

    if (query.status) {
      where.status = query.status;
    }

    if (query.categoryId) {
      where.categoryId = query.categoryId;
    }

    if (query.sellerId) {
      where.sellerId = query.sellerId;
    }

    if (query.search?.trim()) {
      const s = query.search.trim();
      where.OR = [
        { name: { contains: s, mode: 'insensitive' } },
        { description: { contains: s, mode: 'insensitive' } },
      ];
    }

    const [total, products] = await Promise.all([
      this.prisma.product.count({ where }),
      this.prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: query.sortOrder || 'desc' },
        include: {
          category: true,
          inventory: true,
          images: true,
          seller: {
            select: {
              id: true,
              sellerType: true,
              businessName: true,
              verificationStatus: true,
              farmLocation: true,
            },
          },
        },
      }),
    ]);

    return {
      data: products,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async getProductById(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        inventory: true,
        images: true,
        seller: {
          select: {
            id: true,
            sellerType: true,
            businessName: true,
            verificationStatus: true,
            farmLocation: true,
            user: {
              select: {
                id: true,
                email: true,
                mobile: true,
              },
            },
          },
        },
      },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    return product;
  }

  async moderateProduct(id: string, dto: ModerateProductDto, actorUserId: string) {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    if (product.status === dto.status) {
      throw new BadRequestException(`Product already has status ${dto.status}`);
    }

    // State machine validation for administrator moderation
    const allowedTransitions: Record<ProductStatus, ProductStatus[]> = {
      ACTIVE: ['OUT_OF_STOCK', 'ARCHIVED', 'REJECTED'],
      OUT_OF_STOCK: ['ACTIVE', 'ARCHIVED', 'REJECTED'],
      ARCHIVED: ['ACTIVE', 'REJECTED'],
      REJECTED: ['ACTIVE', 'ARCHIVED'],
    };

    const validTargets = allowedTransitions[product.status] || [];
    if (!validTargets.includes(dto.status)) {
      throw new BadRequestException(
        `Invalid status transition from ${product.status} to ${dto.status}. Allowed transitions: ${validTargets.join(', ')}`,
      );
    }

    const previousStatus = product.status;
    const updatedProduct = await this.prisma.product.update({
      where: { id },
      data: { status: dto.status },
      include: {
        category: true,
        inventory: true,
        seller: {
          select: {
            id: true,
            sellerType: true,
            businessName: true,
          },
        },
      },
    });

    await this.auditLogService.logAction({
      actorUserId,
      action: 'PRODUCT_MODERATION',
      entityType: 'PRODUCT',
      entityId: id,
      previousState: { status: previousStatus },
      newState: { status: dto.status },
      reason: dto.reason || `Administrative moderation changed status from ${previousStatus} to ${dto.status}`,
    });

    return updatedProduct;
  }

  // ---------------------------------------------------------------------------
  // 5. ORDER MANAGEMENT
  // ---------------------------------------------------------------------------

  async getOrders(query: AdminOrderQueryDto) {
    const page = Number(query.page) || 1;
    const limit = Math.min(Number(query.limit) || 10, 100);
    const skip = (page - 1) * limit;

    const where: Prisma.OrderWhereInput = {};

    if (query.status) {
      where.status = query.status;
    }

    if (query.sellerId) {
      where.sellerId = query.sellerId;
    }

    if (query.buyerId) {
      where.buyerId = query.buyerId;
    }

    if (query.search?.trim()) {
      where.orderNumber = { contains: query.search.trim(), mode: 'insensitive' };
    }

    const [total, orders] = await Promise.all([
      this.prisma.order.count({ where }),
      this.prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: query.sortOrder || 'desc' },
        include: {
          buyer: {
            select: {
              id: true,
              buyerType: true,
              businessName: true,
              user: {
                select: { id: true, email: true, mobile: true },
              },
            },
          },
          seller: {
            select: {
              id: true,
              sellerType: true,
              businessName: true,
              user: {
                select: { id: true, email: true, mobile: true },
              },
            },
          },
          payment: {
            select: {
              id: true,
              amount: true,
              status: true,
              providerReference: true,
            },
          },
          shipment: {
            select: {
              id: true,
              status: true,
              provider: true,
              trackingNumber: true,
            },
          },
          items: {
            include: {
              product: {
                select: { id: true, name: true, unit: true },
              },
            },
          },
        },
      }),
    ]);

    return {
      data: orders,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async getOrderById(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        buyer: {
          include: {
            user: {
              select: { id: true, email: true, mobile: true, status: true },
            },
          },
        },
        seller: {
          include: {
            user: {
              select: { id: true, email: true, mobile: true, status: true },
            },
          },
        },
        payment: true,
        shipment: {
          include: {
            events: {
              orderBy: { occurredAt: 'desc' },
            },
          },
        },
        items: {
          include: {
            product: {
              include: {
                category: true,
                images: { take: 1 },
              },
            },
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }

    return order;
  }

  // ---------------------------------------------------------------------------
  // 6. PAYMENT VISIBILITY
  // ---------------------------------------------------------------------------

  async getPayments(query: AdminPaymentQueryDto) {
    const page = Number(query.page) || 1;
    const limit = Math.min(Number(query.limit) || 10, 100);
    const skip = (page - 1) * limit;

    const where: Prisma.PaymentWhereInput = {};

    if (query.status) {
      where.status = query.status;
    }

    if (query.orderId) {
      where.orderId = query.orderId;
    }

    if (query.search?.trim()) {
      where.providerReference = { contains: query.search.trim(), mode: 'insensitive' };
    }

    const [total, payments] = await Promise.all([
      this.prisma.payment.count({ where }),
      this.prisma.payment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: query.sortOrder || 'desc' },
        select: {
          id: true,
          orderId: true,
          amount: true,
          status: true,
          providerReference: true,
          createdAt: true,
          updatedAt: true,
          order: {
            select: {
              id: true,
              orderNumber: true,
              buyerId: true,
              sellerId: true,
              totalAmount: true,
            },
          },
        },
      }),
    ]);

    return {
      data: payments,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  // ---------------------------------------------------------------------------
  // 7. LOGISTICS / SHIPMENT VISIBILITY
  // ---------------------------------------------------------------------------

  async getShipments(query: AdminShipmentQueryDto) {
    const page = Number(query.page) || 1;
    const limit = Math.min(Number(query.limit) || 10, 100);
    const skip = (page - 1) * limit;

    const where: Prisma.ShipmentWhereInput = {};

    if (query.status) {
      where.status = query.status;
    }

    if (query.provider?.trim()) {
      where.provider = query.provider.trim();
    }

    if (query.trackingNumber?.trim()) {
      where.trackingNumber = { contains: query.trackingNumber.trim(), mode: 'insensitive' };
    }

    if (query.search?.trim()) {
      const s = query.search.trim();
      where.OR = [
        { trackingNumber: { contains: s, mode: 'insensitive' } },
        { provider: { contains: s, mode: 'insensitive' } },
        { order: { orderNumber: { contains: s, mode: 'insensitive' } } },
      ];
    }

    const [total, shipments] = await Promise.all([
      this.prisma.shipment.count({ where }),
      this.prisma.shipment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: query.sortOrder || 'desc' },
        include: {
          order: {
            select: {
              id: true,
              orderNumber: true,
              sellerId: true,
              buyerId: true,
            },
          },
          events: {
            take: 1,
            orderBy: { occurredAt: 'desc' },
          },
        },
      }),
    ]);

    return {
      data: shipments,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async getShipmentById(id: string) {
    const shipment = await this.prisma.shipment.findUnique({
      where: { id },
      include: {
        order: {
          include: {
            seller: {
              select: {
                id: true,
                sellerType: true,
                businessName: true,
                user: { select: { email: true, mobile: true } },
              },
            },
            buyer: {
              select: {
                id: true,
                buyerType: true,
                businessName: true,
                user: { select: { email: true, mobile: true } },
              },
            },
          },
        },
        events: {
          orderBy: { occurredAt: 'desc' },
        },
      },
    });

    if (!shipment) {
      throw new NotFoundException(`Shipment with ID ${id} not found`);
    }

    return shipment;
  }

  // ---------------------------------------------------------------------------
  // 8. REPORT / MODERATION SYSTEM
  // ---------------------------------------------------------------------------

  async createReport(dto: CreateReportDto, reporterUserId: string) {
    // 1. Validate target existence based on targetType
    switch (dto.targetType) {
      case 'USER': {
        const user = await this.prisma.user.findUnique({
          where: { id: dto.targetId },
          select: { id: true },
        });
        if (!user) {
          throw new NotFoundException('Report target user does not exist');
        }
        break;
      }
      case 'PRODUCT': {
        const product = await this.prisma.product.findUnique({
          where: { id: dto.targetId },
          select: { id: true },
        });
        if (!product) {
          throw new NotFoundException('Report target product does not exist');
        }
        break;
      }
      case 'SELLER': {
        const seller = await this.prisma.sellerProfile.findUnique({
          where: { id: dto.targetId },
          select: { id: true },
        });
        if (!seller) {
          throw new NotFoundException('Report target seller does not exist');
        }
        break;
      }
      case 'ORDER': {
        // Enforce appropriate reporter access/ownership semantics without leaking
        // whether an arbitrary private order exists to unauthorized probers
        const order = await this.prisma.order.findUnique({
          where: { id: dto.targetId },
          select: {
            id: true,
            buyer: { select: { userId: true } },
            seller: { select: { userId: true } },
          },
        });
        if (
          !order ||
          (order.buyer.userId !== reporterUserId && order.seller.userId !== reporterUserId)
        ) {
          throw new NotFoundException('Report target order not found or access denied');
        }
        break;
      }
      default:
        throw new BadRequestException('Invalid report target type');
    }

    // 2. Prevent duplicate open reports for the same target by the same reporter
    const existing = await this.prisma.moderationReport.findFirst({
      where: {
        reporterUserId,
        targetType: dto.targetType,
        targetId: dto.targetId,
        status: { in: ['OPEN', 'UNDER_REVIEW'] },
      },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException('A pending moderation report for this target is already under review');
    }

    // 3. Create report with safe projection
    return this.prisma.moderationReport.create({
      data: {
        reporterUserId,
        targetType: dto.targetType,
        targetId: dto.targetId,
        reason: dto.reason.trim(),
        description: dto.description?.trim(),
      },
      select: {
        id: true,
        targetType: true,
        targetId: true,
        reason: true,
        description: true,
        status: true,
        createdAt: true,
      },
    });
  }

  async getReports(query: AdminReportQueryDto) {
    const page = Number(query.page) || 1;
    const limit = Math.min(Number(query.limit) || 10, 100);
    const skip = (page - 1) * limit;

    const where: Prisma.ModerationReportWhereInput = {};

    if (query.status) {
      where.status = query.status;
    }

    if (query.targetType) {
      where.targetType = query.targetType;
    }

    if (query.search?.trim()) {
      const s = query.search.trim();
      where.OR = [
        { reason: { contains: s, mode: 'insensitive' } },
        { description: { contains: s, mode: 'insensitive' } },
        { targetId: { contains: s } },
      ];
    }

    const [total, reports] = await Promise.all([
      this.prisma.moderationReport.count({ where }),
      this.prisma.moderationReport.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: query.sortOrder || 'desc' },
        include: {
          reporter: {
            select: {
              id: true,
              email: true,
              role: true,
            },
          },
          reviewedBy: {
            select: {
              id: true,
              email: true,
              role: true,
            },
          },
        },
      }),
    ]);

    return {
      data: reports,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async getReportById(id: string) {
    const report = await this.prisma.moderationReport.findUnique({
      where: { id },
      include: {
        reporter: {
          select: {
            id: true,
            email: true,
            role: true,
          },
        },
        reviewedBy: {
          select: {
            id: true,
            email: true,
            role: true,
          },
        },
      },
    });

    if (!report) {
      throw new NotFoundException(`Moderation report with ID ${id} not found`);
    }

    return report;
  }

  async reviewReport(id: string, dto: ReviewReportDto, actorUserId: string) {
    const report = await this.prisma.moderationReport.findUnique({ where: { id } });
    if (!report) {
      throw new NotFoundException(`Moderation report with ID ${id} not found`);
    }

    const previousStatus = report.status;
    const updatedReport = await this.prisma.moderationReport.update({
      where: { id },
      data: {
        status: dto.status,
        resolutionNotes: dto.resolutionNotes,
        reviewedByUserId: actorUserId,
        reviewedAt: new Date(),
      },
      include: {
        reporter: { select: { id: true, email: true, role: true } },
        reviewedBy: { select: { id: true, email: true, role: true } },
      },
    });

    await this.auditLogService.logAction({
      actorUserId,
      action: 'REPORT_RESOLUTION',
      entityType: 'REPORT',
      entityId: id,
      previousState: { status: previousStatus },
      newState: { status: dto.status },
      reason: dto.resolutionNotes || `Report status updated from ${previousStatus} to ${dto.status}`,
    });

    return updatedReport;
  }
}

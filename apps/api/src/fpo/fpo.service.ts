// FPO Service — Farmer Producer Organisation Aggregation & Payout Management
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuditLogService } from '../admin/audit-log.service.js';
import {
  Prisma,
  FpoStatus,
  FpoMembershipStatus,
  FpoListingStatus,
  FpoBatchStatus,
  FpoBuyRequestStatus,
  FpoSettlementStatus,
  OrderType,
  OrderStatus,
  Role,
} from '@prisma/client';
import { RegisterFpoDto } from './dto/register-fpo.dto.js';
import { CommitListingDto } from './dto/commit-listing.dto.js';
import { CreateBatchDto } from './dto/create-batch.dto.js';
import { PostBuyRequestDto } from './dto/post-buy-request.dto.js';
import { CreateSettlementDto } from './dto/create-settlement.dto.js';
import { FpoFilterDto, FpoListingFilterDto, BuyRequestFilterDto } from './dto/fpo-query.dto.js';

@Injectable()
export class FpoService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
  ) {}

  /**
   * Internal security barrier ensuring user is FPO admin or platform administrator
   */
  private async verifyAdmin(userId: string, fpoId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true },
    });

    if (!user) {
      throw new ForbiddenException('Authenticated user not found');
    }

    if (user.role === Role.ADMIN) {
      return; // Platform admin override
    }

    const fpo = await this.prisma.fpoOrganization.findUnique({
      where: { id: fpoId },
      select: { id: true, adminId: true, name: true },
    });

    if (!fpo) {
      throw new NotFoundException(`FPO organization with ID ${fpoId} not found`);
    }

    if (fpo.adminId !== userId) {
      throw new ForbiddenException(
        `You do not hold administrative privileges for ${fpo.name}`,
      );
    }
  }

  // ===========================================================================
  // 1. FPO REGISTRATION & MANAGEMENT
  // ===========================================================================

  /**
   * Register a new Farmer Producer Organisation with PENDING_VERIFICATION status
   */
  async registerFpo(adminId: string, dto: RegisterFpoDto) {
    const existing = await this.prisma.fpoOrganization.findUnique({
      where: { registrationNumber: dto.registrationNumber },
    });

    if (existing) {
      throw new ConflictException(
        `An FPO with registration number ${dto.registrationNumber} already exists`,
      );
    }

    const adminUser = await this.prisma.user.findUnique({
      where: { id: adminId },
    });

    if (!adminUser) {
      throw new NotFoundException('Admin user not found');
    }

    return this.prisma.$transaction(async (tx) => {
      const fpo = await tx.fpoOrganization.create({
        data: {
          name: dto.name,
          registrationNumber: dto.registrationNumber,
          legalStructure: dto.legalStructure,
          status: FpoStatus.PENDING_VERIFICATION,
          registrationDate: dto.registrationDate ? new Date(dto.registrationDate) : new Date(),
          state: dto.state,
          district: dto.district,
          address: dto.address,
          pincode: dto.pincode,
          contactEmail: dto.contactEmail,
          contactPhone: dto.contactPhone,
          bankAccountNumber: dto.bankAccountNumber,
          ifscCode: dto.ifscCode,
          bankName: dto.bankName,
          description: dto.description,
          logoUrl: dto.logoUrl,
          adminId,
        },
      });

      // Synchronize or create SellerProfile for FPO admin
      const existingSeller = await tx.sellerProfile.findUnique({
        where: { userId: adminId },
      });

      if (!existingSeller) {
        await tx.sellerProfile.create({
          data: {
            userId: adminId,
            sellerType: 'FPO',
            businessName: dto.name,
            farmLocation: `${dto.district}, ${dto.state}`,
            verificationStatus: 'PENDING',
          },
        });
      } else {
        await tx.sellerProfile.update({
          where: { userId: adminId },
          data: {
            sellerType: 'FPO',
            businessName: dto.name,
            farmLocation: `${dto.district}, ${dto.state}`,
          },
        });
      }

      await this.auditLogService.logAction({
        actorUserId: adminId,
        action: 'FPO_REGISTERED',
        entityType: 'FPO_ORGANIZATION',
        entityId: fpo.id,
        newState: { name: fpo.name, regNo: fpo.registrationNumber },
        reason: 'New FPO organization submitted for platform accreditation',
      });

      return fpo;
    });
  }

  /**
   * List verified FPOs with optional geographic and commodity filters
   */
  async listFpos(filters: FpoFilterDto) {
    const where: Prisma.FpoOrganizationWhereInput = {
      status: filters.status || FpoStatus.ACTIVE,
    };

    if (filters.state) {
      where.state = { contains: filters.state, mode: 'insensitive' };
    }

    if (filters.district) {
      where.district = { contains: filters.district, mode: 'insensitive' };
    }

    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { registrationNumber: { contains: filters.search, mode: 'insensitive' } },
        { district: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    if (filters.commodity) {
      where.listings = {
        some: {
          commodity: { contains: filters.commodity, mode: 'insensitive' },
        },
      };
    }

    const fpos = await this.prisma.fpoOrganization.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            memberships: { where: { status: FpoMembershipStatus.APPROVED } },
            listings: { where: { status: FpoListingStatus.COMMITTED } },
            batches: true,
          },
        },
      },
    });

    return fpos.map((fpo: (typeof fpos)[0]) => ({
      ...fpo,
      memberCount: fpo._count.memberships,
      activeListingsCount: fpo._count.listings,
      batchesCount: fpo._count.batches,
    }));
  }

  /**
   * Retrieve full FPO profile with administration overview and member counts
   */
  async getFpoById(fpoId: string) {
    const fpo = await this.prisma.fpoOrganization.findUnique({
      where: { id: fpoId },
      include: {
        admin: {
          select: {
            id: true,
            email: true,
            mobile: true,
          },
        },
        _count: {
          select: {
            memberships: { where: { status: FpoMembershipStatus.APPROVED } },
            listings: true,
            batches: true,
          },
        },
      },
    });

    if (!fpo) {
      throw new NotFoundException(`FPO with ID ${fpoId} not found`);
    }

    // Retrieve active commodities from committed and aggregated listings
    const activeCommodities = await this.prisma.fpoListing.findMany({
      where: {
        fpoId,
        status: { in: [FpoListingStatus.COMMITTED, FpoListingStatus.AGGREGATED] },
      },
      select: { commodity: true },
      distinct: ['commodity'],
    });

    return {
      ...fpo,
      memberCount: fpo._count.memberships,
      totalListingsCount: fpo._count.listings,
      totalBatchesCount: fpo._count.batches,
      activeCommodities: activeCommodities.map((c: { commodity: string }) => c.commodity),
    };
  }

  // ===========================================================================
  // 2. FARMER MEMBERSHIP OPERATIONS
  // ===========================================================================

  /**
   * Request membership in an active FPO organization
   */
  async requestMembership(farmerId: string, fpoId: string, shareCapital?: number) {
    const fpo = await this.prisma.fpoOrganization.findUnique({
      where: { id: fpoId },
    });

    if (!fpo) {
      throw new NotFoundException(`FPO with ID ${fpoId} not found`);
    }

    if (fpo.status !== FpoStatus.ACTIVE) {
      throw new BadRequestException(
        'Cannot request membership in an FPO that is not currently ACTIVE',
      );
    }

    const existing = await this.prisma.fpoMembership.findUnique({
      where: {
        fpoId_farmerId: { fpoId, farmerId },
      },
    });

    if (existing) {
      if (
        existing.status === FpoMembershipStatus.PENDING ||
        existing.status === FpoMembershipStatus.APPROVED
      ) {
        throw new BadRequestException(
          `You already have an active or pending membership request with this FPO (Status: ${existing.status})`,
        );
      }

      // Re-apply if previously rejected or left
      return this.prisma.fpoMembership.update({
        where: { id: existing.id },
        data: {
          status: FpoMembershipStatus.PENDING,
          shareCapital: shareCapital !== undefined ? new Prisma.Decimal(shareCapital) : null,
          joinedAt: null,
          approvedAt: null,
          approvedBy: null,
          rejectionReason: null,
        },
      });
    }

    return this.prisma.fpoMembership.create({
      data: {
        fpoId,
        farmerId,
        status: FpoMembershipStatus.PENDING,
        shareCapital: shareCapital !== undefined ? new Prisma.Decimal(shareCapital) : null,
      },
    });
  }

  /**
   * FPO Admin approves or rejects a farmer membership application
   */
  async approveMembership(
    adminId: string,
    membershipId: string,
    approve: boolean,
    reason?: string,
  ) {
    const membership = await this.prisma.fpoMembership.findUnique({
      where: { id: membershipId },
      include: { fpo: true },
    });

    if (!membership) {
      throw new NotFoundException(`Membership application ${membershipId} not found`);
    }

    await this.verifyAdmin(adminId, membership.fpoId);

    const now = new Date();
    const updated = await this.prisma.fpoMembership.update({
      where: { id: membershipId },
      data: {
        status: approve ? FpoMembershipStatus.APPROVED : FpoMembershipStatus.REJECTED,
        approvedAt: approve ? now : null,
        joinedAt: approve ? now : null,
        approvedBy: approve ? adminId : null,
        rejectionReason: approve ? null : reason || 'Application declined by FPO administration',
      },
      include: {
        farmer: {
          select: { id: true, email: true, mobile: true },
        },
      },
    });

    await this.auditLogService.logAction({
      actorUserId: adminId,
      action: 'FPO_MEMBERSHIP_APPROVAL',
      entityType: 'FPO_MEMBERSHIP',
      entityId: membershipId,
      newState: { status: updated.status },
      reason: approve ? 'Farmer accepted into FPO' : reason,
    });

    return updated;
  }

  /**
   * List all member applications and active roster for an FPO
   */
  async getFpoMembers(adminId: string, fpoId: string, status?: FpoMembershipStatus) {
    await this.verifyAdmin(adminId, fpoId);

    return this.prisma.fpoMembership.findMany({
      where: {
        fpoId,
        status: status || undefined,
      },
      orderBy: { createdAt: 'desc' },
      include: {
        farmer: {
          select: {
            id: true,
            email: true,
            mobile: true,
            sellerProfile: true,
          },
        },
      },
    });
  }

  /**
   * Get all FPO memberships for an authenticated farmer
   */
  async getFarmerMemberships(farmerId: string) {
    return this.prisma.fpoMembership.findMany({
      where: { farmerId },
      include: {
        fpo: {
          select: {
            id: true,
            name: true,
            registrationNumber: true,
            state: true,
            district: true,
            contactPhone: true,
            status: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ===========================================================================
  // 3. PRODUCE COMMITMENTS (LISTINGS)
  // ===========================================================================

  /**
   * Farmer commits expected or harvested produce to an approved FPO
   */
  async commitListing(farmerId: string, fpoId: string, dto: CommitListingDto) {
    // Verify farmer holds APPROVED membership in this FPO
    const membership = await this.prisma.fpoMembership.findFirst({
      where: {
        fpoId,
        farmerId,
        status: FpoMembershipStatus.APPROVED,
      },
    });

    if (!membership) {
      throw new ForbiddenException(
        'You must have an APPROVED membership in this FPO to commit produce',
      );
    }

    return this.prisma.fpoListing.create({
      data: {
        fpoId,
        farmerId,
        commodity: dto.commodity.trim(),
        quantityQuintals: new Prisma.Decimal(dto.quantityQuintals),
        qualityGrade: dto.qualityGrade || 'Grade A',
        expectedHarvestDate: dto.expectedHarvestDate
          ? new Date(dto.expectedHarvestDate)
          : new Date(),
        notes: dto.notes,
        status: FpoListingStatus.COMMITTED,
      },
      include: {
        fpo: {
          select: { id: true, name: true },
        },
      },
    });
  }

  /**
   * Retrieve all produce commitments submitted by the authenticated farmer
   */
  async getFarmerListings(farmerId: string) {
    return this.prisma.fpoListing.findMany({
      where: { farmerId },
      include: {
        fpo: {
          select: {
            id: true,
            name: true,
            state: true,
            district: true,
          },
        },
        batch: {
          select: {
            id: true,
            batchNumber: true,
            status: true,
            commodity: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Retrieve all farmer commitments submitted to a specific FPO
   */
  async getFpoListings(
    adminId: string,
    fpoId: string,
    query: FpoListingFilterDto = {},
  ) {
    await this.verifyAdmin(adminId, fpoId);

    const where: Prisma.FpoListingWhereInput = { fpoId };

    if (query.status) {
      where.status = query.status;
    }

    if (query.commodity) {
      where.commodity = { contains: query.commodity, mode: 'insensitive' };
    }

    return this.prisma.fpoListing.findMany({
      where,
      include: {
        farmer: {
          select: {
            id: true,
            email: true,
            mobile: true,
            sellerProfile: true,
          },
        },
        batch: {
          select: {
            id: true,
            batchNumber: true,
            status: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ===========================================================================
  // 4. BATCH AGGREGATION & SEALING
  // ===========================================================================

  /**
   * FPO Admin aggregates committed member listings into a unified lot batch
   */
  async createBatch(adminId: string, fpoId: string, dto: CreateBatchDto) {
    await this.verifyAdmin(adminId, fpoId);

    // Enforce FPO member participation validation
    const approvedMembersCount = await this.prisma.fpoMembership.count({
      where: { fpoId, status: FpoMembershipStatus.APPROVED },
    });

    if (approvedMembersCount < 1) {
      throw new BadRequestException(
        'FPO must have at least one approved member to aggregate listings',
      );
    }

    // Validate listings belong to this FPO and are in COMMITTED status
    const listings = await this.prisma.fpoListing.findMany({
      where: {
        id: { in: dto.listingIds },
        fpoId,
        status: FpoListingStatus.COMMITTED,
      },
    });

    if (listings.length !== dto.listingIds.length) {
      throw new BadRequestException(
        'All selected listings must belong to this FPO and have COMMITTED status',
      );
    }

    // Verify all listings share the same commodity
    const commodity = listings[0].commodity;
    const isMixed = listings.some(
      (l: { commodity: string }) => l.commodity.toLowerCase() !== commodity.toLowerCase(),
    );

    if (isMixed) {
      throw new BadRequestException(
        'All listings pooled into a single batch must share the exact same commodity',
      );
    }

    const totalQuantity = listings.reduce(
      (acc: number, l: { quantityQuintals: Prisma.Decimal | number }) =>
        acc + Number(l.quantityQuintals),
      0,
    );

    // Format batchNumber: {COMMODITY_3CHARS}-{YYYY}-{MM}-{0001}
    const prefix = commodity.slice(0, 3).toUpperCase().replace(/[^A-Z]/g, 'LOT');
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const totalBatchCount = await this.prisma.fpoAggregationBatch.count();
    let seqNum = totalBatchCount + 1;
    let batchNumber = `${prefix}-${year}-${month}-${String(seqNum).padStart(4, '0')}`;
    while (await this.prisma.fpoAggregationBatch.findUnique({ where: { batchNumber } })) {
      seqNum++;
      batchNumber = `${prefix}-${year}-${month}-${String(seqNum).padStart(4, '0')}`;
    }

    return this.prisma.$transaction(async (tx) => {
      const batch = await tx.fpoAggregationBatch.create({
        data: {
          fpoId,
          batchNumber,
          commodity,
          totalQuantity: new Prisma.Decimal(totalQuantity),
          qualityGrade: dto.qualityGrade || listings[0].qualityGrade || 'Grade A',
          status: FpoBatchStatus.OPEN,
        },
      });

      await tx.fpoListing.updateMany({
        where: { id: { in: dto.listingIds } },
        data: {
          status: FpoListingStatus.AGGREGATED,
          batchId: batch.id,
        },
      });

      await this.auditLogService.logAction({
        actorUserId: adminId,
        action: 'FPO_BATCH_CREATED',
        entityType: 'FPO_BATCH',
        entityId: batch.id,
        newState: { batchNumber, commodity, totalQuantity, listingsCount: listings.length },
        reason: 'Aggregated member harvest into collective wholesale lot',
      });

      return batch;
    });
  }

  /**
   * Seal an open batch to freeze its volume and enable algorithmic buyer matching
   */
  async sealBatch(adminId: string, batchId: string) {
    const batch = await this.prisma.fpoAggregationBatch.findUnique({
      where: { id: batchId },
      include: { fpo: true },
    });

    if (!batch) {
      throw new NotFoundException(`Batch ${batchId} not found`);
    }

    await this.verifyAdmin(adminId, batch.fpoId);

    if (batch.status !== FpoBatchStatus.OPEN) {
      throw new BadRequestException('Only batches in OPEN status can be sealed');
    }

    const updated = await this.prisma.fpoAggregationBatch.update({
      where: { id: batchId },
      data: {
        status: FpoBatchStatus.SEALED,
        sealedAt: new Date(),
      },
    });

    await this.auditLogService.logAction({
      actorUserId: adminId,
      action: 'FPO_BATCH_SEALED',
      entityType: 'FPO_BATCH',
      entityId: batchId,
      newState: { status: FpoBatchStatus.SEALED, totalQuantity: batch.totalQuantity },
      reason: 'FPO Admin confirmed aggregation volume and sealed lot for buyer dispatch',
    });

    return updated;
  }

  /**
   * List all batches for an FPO with filtering
   */
  async getFpoBatches(adminId: string, fpoId: string, status?: FpoBatchStatus) {
    await this.verifyAdmin(adminId, fpoId);

    return this.prisma.fpoAggregationBatch.findMany({
      where: {
        fpoId,
        status: status || undefined,
      },
      include: {
        listings: {
          include: {
            farmer: {
              select: { id: true, email: true, mobile: true },
            },
          },
        },
        buyRequest: true,
        settlements: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ===========================================================================
  // 5. BUYER BULK PROCUREMENT REQUESTS
  // ===========================================================================

  /**
   * Buyer posts an institutional bulk procurement requirement
   */
  async postBuyRequest(buyerId: string, dto: PostBuyRequestDto) {
    return this.prisma.fpoBuyRequest.create({
      data: {
        buyerId,
        commodity: dto.commodity.trim(),
        requiredQuantity: new Prisma.Decimal(dto.requiredQuantity),
        filledQuantity: new Prisma.Decimal(0),
        targetPrice: dto.targetPrice ? new Prisma.Decimal(dto.targetPrice) : null,
        deliveryCity: dto.deliveryCity,
        maxDistanceKm: dto.maxDistanceKm,
        qualityRequirements: dto.qualityRequirements,
        notes: dto.notes,
        status: FpoBuyRequestStatus.OPEN,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
      },
      include: {
        buyer: {
          select: { id: true, email: true, mobile: true },
        },
      },
    });
  }

  /**
   * List active buyer bulk procurement requests
   */
  async listBuyRequests(filters: BuyRequestFilterDto = {}) {
    const where: Prisma.FpoBuyRequestWhereInput = {};

    if (filters.status) {
      where.status = filters.status;
    } else {
      where.status = {
        in: [FpoBuyRequestStatus.OPEN, FpoBuyRequestStatus.PARTIALLY_MATCHED],
      };
    }

    if (filters.commodity) {
      where.commodity = { contains: filters.commodity, mode: 'insensitive' };
    }

    return this.prisma.fpoBuyRequest.findMany({
      where,
      include: {
        buyer: {
          select: {
            id: true,
            email: true,
            mobile: true,
            buyerProfile: true,
          },
        },
        fpo: {
          select: { id: true, name: true, state: true, district: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ===========================================================================
  // 6. ALGORITHMIC MATCHING & ORDER CREATION
  // ===========================================================================

  /**
   * Match sealed FPO batches against active institutional procurement requests
   * Requirements:
   * 1. Case-insensitive commodity match
   * 2. Quantity compatibility (≥50% coverage)
   */
  async getMatchedBatches(adminId: string, fpoId: string) {
    await this.verifyAdmin(adminId, fpoId);

    const sealedBatches = await this.prisma.fpoAggregationBatch.findMany({
      where: {
        fpoId,
        status: FpoBatchStatus.SEALED,
      },
      include: { listings: true },
    });

    const activeBuyRequests = await this.prisma.fpoBuyRequest.findMany({
      where: {
        status: {
          in: [FpoBuyRequestStatus.OPEN, FpoBuyRequestStatus.PARTIALLY_MATCHED],
        },
      },
      include: {
        buyer: {
          select: {
            id: true,
            email: true,
            mobile: true,
            buyerProfile: true,
          },
        },
      },
    });

    const matches: Array<{
      batch: typeof sealedBatches[0];
      buyRequest: typeof activeBuyRequests[0];
      remainingQuantity: number;
      matchPercentage: number;
      canFulfillImmediately: boolean;
    }> = [];

    for (const batch of sealedBatches) {
      const batchQty = Number(batch.totalQuantity);

      for (const req of activeBuyRequests) {
        const remaining = Number(req.requiredQuantity) - Number(req.filledQuantity);
        if (remaining <= 0) continue;

        // 1. Case-insensitive commodity match
        if (batch.commodity.toLowerCase().trim() !== req.commodity.toLowerCase().trim()) {
          continue;
        }

        // 2. Quantity coverage ratio
        const coverageRatio = batchQty / remaining;
        const reverseRatio = remaining / batchQty;

        // Either batch covers >= 50% of remaining requirement OR remaining covers >= 50% of batch
        if (coverageRatio >= 0.5 || reverseRatio >= 0.5) {
          const matchPercentage = Math.min(
            100,
            Math.round((Math.min(batchQty, remaining) / Math.max(batchQty, remaining)) * 100),
          );

          matches.push({
            batch,
            buyRequest: req,
            remainingQuantity: remaining,
            matchPercentage,
            canFulfillImmediately: batchQty >= remaining,
          });
        }
      }
    }

    return matches.sort((a, b) => b.matchPercentage - a.matchPercentage);
  }

  /**
   * Execute batch match to buy request: creates Order, updates inventory, and dispatches batch
   */
  async matchBatchToRequest(adminId: string, batchId: string, buyRequestId: string) {
    const batch = await this.prisma.fpoAggregationBatch.findUnique({
      where: { id: batchId },
      include: { fpo: true, listings: true },
    });

    if (!batch) {
      throw new NotFoundException(`Batch ${batchId} not found`);
    }

    await this.verifyAdmin(adminId, batch.fpoId);

    if (batch.status !== FpoBatchStatus.SEALED) {
      throw new BadRequestException('Batch must be in SEALED status to match to a buyer');
    }

    const buyRequest = await this.prisma.fpoBuyRequest.findUnique({
      where: { id: buyRequestId },
      include: { buyer: true },
    });

    if (!buyRequest) {
      throw new NotFoundException(`Buy request ${buyRequestId} not found`);
    }

    if (
      buyRequest.status !== FpoBuyRequestStatus.OPEN &&
      buyRequest.status !== FpoBuyRequestStatus.PARTIALLY_MATCHED
    ) {
      throw new BadRequestException('Buy request is not open for matching');
    }

    const remainingQty =
      Number(buyRequest.requiredQuantity) - Number(buyRequest.filledQuantity);

    if (remainingQty <= 0) {
      throw new BadRequestException('Buy request is already fully fulfilled');
    }

    const batchQty = Number(batch.totalQuantity);
    const matchedQty = Math.min(remainingQty, batchQty);
    const targetPrice = Number(buyRequest.targetPrice) || 1900;
    const totalAmount = matchedQty * targetPrice;

    return this.prisma.$transaction(async (tx) => {
      // 1. Resolve or create BuyerProfile
      let buyerProfile = await tx.buyerProfile.findUnique({
        where: { userId: buyRequest.buyerId },
      });

      if (!buyerProfile) {
        buyerProfile = await tx.buyerProfile.create({
          data: {
            userId: buyRequest.buyerId,
            buyerType: 'BUSINESS',
            businessName: 'Institutional Procurement Buyer',
            verificationStatus: 'VERIFIED',
          },
        });
      }

      // 2. Resolve or create SellerProfile for FPO Admin
      let sellerProfile = await tx.sellerProfile.findUnique({
        where: { userId: batch.fpo.adminId },
      });

      if (!sellerProfile) {
        sellerProfile = await tx.sellerProfile.create({
          data: {
            userId: batch.fpo.adminId,
            sellerType: 'FPO',
            businessName: batch.fpo.name,
            farmLocation: `${batch.fpo.district}, ${batch.fpo.state}`,
            verificationStatus: 'VERIFIED',
          },
        });
      }

      // 3. Resolve or create Product for this bulk lot
      let category =
        (await tx.category.findFirst({
          where: { name: { contains: batch.commodity, mode: 'insensitive' } },
        })) || (await tx.category.findFirst());

      if (!category) {
        category = await tx.category.create({
          data: {
            name: 'Wholesale Agriculture',
            slug: 'wholesale-agriculture',
            description: 'Institutional bulk agricultural produce',
          },
        });
      }

      let product = await tx.product.findFirst({
        where: {
          sellerId: sellerProfile.id,
          name: { contains: batch.commodity, mode: 'insensitive' },
        },
      });

      if (!product) {
        product = await tx.product.create({
          data: {
            sellerId: sellerProfile.id,
            categoryId: category.id,
            name: `${batch.commodity} (FPO Bulk Lot - ${batch.batchNumber})`,
            description: `Aggregated wholesale lot of ${batch.commodity} from ${batch.fpo.name}. Quality Grade: ${batch.qualityGrade || 'Grade A'}`,
            price: new Prisma.Decimal(targetPrice),
            unit: 'QUINTAL',
            status: 'ACTIVE',
            state: batch.fpo.state,
            district: batch.fpo.district,
          },
        });

        await tx.inventory.create({
          data: {
            productId: product.id,
            availableQuantity: new Prisma.Decimal(batchQty),
            reservedQuantity: new Prisma.Decimal(0),
          },
        });
      }

      // Decrement inventory stock
      await tx.inventory.updateMany({
        where: { productId: product.id },
        data: {
          availableQuantity: {
            decrement: new Prisma.Decimal(matchedQty),
          },
        },
      });

      // 4. Create Order
      const orderNumber = `ORD-FPO-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
      const order = await tx.order.create({
        data: {
          orderNumber,
          buyerId: buyerProfile.id,
          sellerId: sellerProfile.id,
          orderType: OrderType.FPO_BULK,
          status: OrderStatus.CONFIRMED,
          totalAmount: new Prisma.Decimal(totalAmount),
          shippingAddressSnapshot: {
            name: 'Institutional Delivery Hub',
            phone: batch.fpo.contactPhone || '9898000001',
            addressLine: 'APMC Bulk Receiving Bay',
            city: buyRequest.deliveryCity || 'Pune',
            state: batch.fpo.state || 'Maharashtra',
            pincode: batch.fpo.pincode || '411001',
          },
          items: {
            create: [
              {
                productId: product.id,
                quantity: new Prisma.Decimal(matchedQty),
                unitPrice: new Prisma.Decimal(targetPrice),
                totalPrice: new Prisma.Decimal(totalAmount),
              },
            ],
          },
          shipment: {
            create: {
              provider: 'MOCK_LOGISTICS',
              trackingNumber: `TRK-FPO-${Date.now()}`,
              status: 'CREATED',
            },
          },
        },
        include: { items: true, shipment: true },
      });

      // 5. Update Batch to DISPATCHED with orderId and buyRequestId
      const updatedBatch = await tx.fpoAggregationBatch.update({
        where: { id: batchId },
        data: {
          status: FpoBatchStatus.DISPATCHED,
          buyRequestId,
          orderId: order.id,
        },
      });

      // 6. Update BuyRequest filledQuantity & status
      const newFilled = Number(buyRequest.filledQuantity) + matchedQty;
      const newStatus =
        newFilled >= Number(buyRequest.requiredQuantity)
          ? FpoBuyRequestStatus.FULLY_MATCHED
          : FpoBuyRequestStatus.PARTIALLY_MATCHED;

      const updatedBuyRequest = await tx.fpoBuyRequest.update({
        where: { id: buyRequestId },
        data: {
          filledQuantity: new Prisma.Decimal(newFilled),
          status: newStatus,
        },
      });

      // 7. Update member listings to SOLD
      await tx.fpoListing.updateMany({
        where: { batchId: batch.id },
        data: { status: FpoListingStatus.SOLD },
      });

      await this.auditLogService.logAction({
        actorUserId: adminId,
        action: 'FPO_BATCH_MATCHED',
        entityType: 'FPO_BATCH',
        entityId: batchId,
        newState: {
          orderId: order.id,
          orderNumber: order.orderNumber,
          matchedQty,
          totalAmount,
          buyRequestId,
        },
        reason: 'Aggregated FPO batch matched to buyer procurement contract',
      });

      return {
        batch: updatedBatch,
        order,
        buyRequest: updatedBuyRequest,
      };
    });
  }

  // ===========================================================================
  // 7. SETTLEMENT & PROPORTIONAL FARMER DISTRIBUTION
  // ===========================================================================

  /**
   * Calculate and generate settlement statement for delivered order
   */
  async createSettlement(adminId: string, batchId: string, deductions: CreateSettlementDto) {
    const batch = await this.prisma.fpoAggregationBatch.findUnique({
      where: { id: batchId },
      include: {
        listings: true,
        buyRequest: true,
        fpo: true,
      },
    });

    if (!batch) {
      throw new NotFoundException(`Batch ${batchId} not found`);
    }

    await this.verifyAdmin(adminId, batch.fpoId);

    if (!batch.orderId) {
      throw new BadRequestException('This batch has not been matched or assigned an Order ID');
    }

    const existing = await this.prisma.fpoSettlement.findUnique({
      where: { orderId: batch.orderId },
    });

    if (existing) {
      throw new ConflictException('A settlement statement already exists for this order');
    }

    const totalQuantity = Number(batch.totalQuantity);
    if (totalQuantity <= 0) {
      throw new BadRequestException('Batch quantity must be greater than zero');
    }

    const targetPrice = Number(batch.buyRequest?.targetPrice) || 1900;
    const grossAmount = totalQuantity * targetPrice;

    const commissionPct = Number(deductions.commissionPercent ?? deductions.fpoCommissionPercentage ?? 3);
    const fpoCommission = (grossAmount * commissionPct) / 100;
    const transportCost = Number(deductions.transportCost ?? 0);
    const handlingCost = Number(deductions.handlingCost ?? 0);
    const otherDeductions = Number(deductions.otherDeductions ?? 0);

    const totalDeductions = fpoCommission + transportCost + handlingCost + otherDeductions;
    const netDistributable = Math.max(0, grossAmount - totalDeductions);
    const ratePerQuintal = netDistributable / totalQuantity;

    return this.prisma.$transaction(async (tx) => {
      const settlement = await tx.fpoSettlement.create({
        data: {
          fpoId: batch.fpoId,
          adminId,
          orderId: batch.orderId!,
          batchId: batch.id,
          grossAmount: new Prisma.Decimal(grossAmount),
          fpoCommission: new Prisma.Decimal(fpoCommission),
          transportCost: new Prisma.Decimal(transportCost),
          handlingCost: new Prisma.Decimal(handlingCost),
          otherDeductions: new Prisma.Decimal(otherDeductions),
          netDistributable: new Prisma.Decimal(netDistributable),
          status: FpoSettlementStatus.PENDING,
        },
      });

      // Proportional farmer payouts
      for (const listing of batch.listings) {
        const farmerQty = Number(listing.quantityQuintals);
        const propGross = farmerQty * targetPrice;
        const propDeductions = (farmerQty / totalQuantity) * totalDeductions;
        const propNet = Math.max(0, propGross - propDeductions);

        await tx.fpoFarmerPayment.create({
          data: {
            settlementId: settlement.id,
            farmerId: listing.farmerId,
            listingId: listing.id,
            quantity: new Prisma.Decimal(farmerQty),
            ratePerQuintal: new Prisma.Decimal(ratePerQuintal),
            grossAmount: new Prisma.Decimal(propGross),
            deductions: new Prisma.Decimal(propDeductions),
            netAmount: new Prisma.Decimal(propNet),
            status: FpoSettlementStatus.PENDING,
          },
        });
      }

      await this.auditLogService.logAction({
        actorUserId: adminId,
        action: 'FPO_SETTLEMENT_CREATED',
        entityType: 'FPO_SETTLEMENT',
        entityId: settlement.id,
        newState: {
          grossAmount,
          netDistributable,
          ratePerQuintal,
          farmersCount: batch.listings.length,
        },
        reason: 'Generated proportional settlement statement for aggregated lot',
      });

      return tx.fpoSettlement.findUnique({
        where: { id: settlement.id },
        include: { farmerPayments: true },
      });
    });
  }

  /**
   * Distribute payments to all member farmers in the settlement pool
   */
  async distributePayments(adminId: string, settlementId: string) {
    const settlement = await this.prisma.fpoSettlement.findUnique({
      where: { id: settlementId },
      include: { batch: true, farmerPayments: true },
    });

    if (!settlement) {
      throw new NotFoundException(`Settlement ${settlementId} not found`);
    }

    await this.verifyAdmin(adminId, settlement.fpoId);

    if (settlement.status !== FpoSettlementStatus.PENDING) {
      throw new BadRequestException('Settlement has already been distributed or processed');
    }

    const now = new Date();

    return this.prisma.$transaction(async (tx) => {
      // 1. Mark each farmer payment record DISTRIBUTED with unique bank mock transaction reference
      for (const payment of settlement.farmerPayments) {
        const txnId = `TXN-FPO-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
        await tx.fpoFarmerPayment.update({
          where: { id: payment.id },
          data: {
            status: FpoSettlementStatus.DISTRIBUTED,
            paidAt: now,
            transactionId: txnId,
          },
        });
      }

      // 2. Mark settlement DISTRIBUTED
      const updatedSettlement = await tx.fpoSettlement.update({
        where: { id: settlementId },
        data: {
          status: FpoSettlementStatus.DISTRIBUTED,
          distributedAt: now,
        },
        include: { farmerPayments: true },
      });

      // 3. Mark batch COMPLETED
      await tx.fpoAggregationBatch.update({
        where: { id: settlement.batchId },
        data: { status: FpoBatchStatus.COMPLETED },
      });

      // 4. Mark Order SETTLED
      await tx.order.update({
        where: { id: settlement.orderId },
        data: { status: OrderStatus.SETTLED },
      });

      await this.auditLogService.logAction({
        actorUserId: adminId,
        action: 'FPO_PAYMENTS_DISTRIBUTED',
        entityType: 'FPO_SETTLEMENT',
        entityId: settlementId,
        newState: {
          status: FpoSettlementStatus.DISTRIBUTED,
          paymentsCount: settlement.farmerPayments.length,
        },
        reason: 'Disbursed net proportional payouts to member farmers',
      });

      return updatedSettlement;
    });
  }

  /**
   * List all settlements for an FPO
   */
  async getFpoSettlements(adminId: string, fpoId: string) {
    await this.verifyAdmin(adminId, fpoId);

    return this.prisma.fpoSettlement.findMany({
      where: { fpoId },
      include: {
        batch: {
          select: {
            id: true,
            batchNumber: true,
            commodity: true,
            totalQuantity: true,
          },
        },
        farmerPayments: {
          include: {
            farmer: {
              select: { id: true, email: true, mobile: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ===========================================================================
  // 8. ADMIN VERIFICATION & OPERATIONAL METRICS
  // ===========================================================================

  /**
   * Platform Administrator activates, rejects, or suspends an FPO
   */
  async verifyFpo(adminId: string, fpoId: string, status: FpoStatus, reason?: string) {
    const fpo = await this.prisma.fpoOrganization.findUnique({
      where: { id: fpoId },
    });

    if (!fpo) {
      throw new NotFoundException(`FPO ${fpoId} not found`);
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.fpoOrganization.update({
        where: { id: fpoId },
        data: { status },
      });

      // Synchronize SellerProfile status
      await tx.sellerProfile.updateMany({
        where: { userId: fpo.adminId },
        data: {
          verificationStatus: status === FpoStatus.ACTIVE ? 'VERIFIED' : 'REJECTED',
        },
      });

      await this.auditLogService.logAction({
        actorUserId: adminId,
        action: 'FPO_VERIFICATION',
        entityType: 'FPO_ORGANIZATION',
        entityId: fpoId,
        previousState: { status: fpo.status },
        newState: { status },
        reason: reason || `Admin updated FPO accreditation status to ${status}`,
      });

      return updated;
    });
  }

  /**
   * Aggregated dashboard KPIs for an FPO admin portal
   */
  async getDashboardStats(adminId: string, fpoId: string) {
    await this.verifyAdmin(adminId, fpoId);

    const fpo = await this.prisma.fpoOrganization.findUnique({
      where: { id: fpoId },
    });

    if (!fpo) {
      throw new NotFoundException(`FPO ${fpoId} not found`);
    }

    const [
      activeMembersCount,
      pendingMembersCount,
      committedListings,
      batches,
      settlements,
    ] = await Promise.all([
      this.prisma.fpoMembership.count({
        where: { fpoId, status: FpoMembershipStatus.APPROVED },
      }),
      this.prisma.fpoMembership.count({
        where: { fpoId, status: FpoMembershipStatus.PENDING },
      }),
      this.prisma.fpoListing.findMany({
        where: { fpoId, status: FpoListingStatus.COMMITTED },
        select: { quantityQuintals: true },
      }),
      this.prisma.fpoAggregationBatch.findMany({
        where: { fpoId },
        select: { id: true, status: true, totalQuantity: true },
      }),
      this.prisma.fpoSettlement.findMany({
        where: { fpoId },
        select: { id: true, status: true, netDistributable: true },
      }),
    ]);

    const committedQuintals = committedListings.reduce(
      (acc: number, l: { quantityQuintals: Prisma.Decimal | number }) =>
        acc + Number(l.quantityQuintals),
      0,
    );

    const openBatchesCount = batches.filter(
      (b: { status: FpoBatchStatus }) =>
        b.status === FpoBatchStatus.OPEN || b.status === FpoBatchStatus.SEALED,
    ).length;

    const matchedOrdersCount = batches.filter(
      (b: { status: FpoBatchStatus }) =>
        b.status === FpoBatchStatus.DISPATCHED || b.status === FpoBatchStatus.COMPLETED,
    ).length;

    const totalDistributedAmount = settlements
      .filter((s: { status: FpoSettlementStatus }) => s.status === FpoSettlementStatus.DISTRIBUTED)
      .reduce((acc: number, s: { netDistributable: Prisma.Decimal | number }) => acc + Number(s.netDistributable), 0);

    return {
      fpo,
      stats: {
        activeMembers: activeMembersCount,
        pendingMembers: pendingMembersCount,
        committedQuintals,
        openBatches: openBatchesCount,
        matchedOrders: matchedOrdersCount,
        totalDistributedAmount,
      },
    };
  }

  /**
   * Helper to retrieve FPO organization managed by a user
   */
  async getFpoByAdminUserId(adminId: string) {
    return this.prisma.fpoOrganization.findFirst({
      where: { adminId },
      include: {
        _count: {
          select: {
            memberships: { where: { status: FpoMembershipStatus.APPROVED } },
            listings: true,
            batches: true,
          },
        },
      },
    });
  }
}

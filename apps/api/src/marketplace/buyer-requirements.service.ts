import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateBuyerRequirementDto } from './dto/create-buyer-requirement.dto.js';

@Injectable()
export class BuyerRequirementsService {
  private readonly logger = new Logger(BuyerRequirementsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async createRequirement(userId: string, dto: CreateBuyerRequirementDto) {
    let buyer = await this.prisma.buyerProfile.findUnique({
      where: { userId },
    });

    if (!buyer) {
      buyer = await this.prisma.buyerProfile.create({
        data: {
          userId,
          businessName: 'Registered Buyer',
          verificationStatus: 'VERIFIED',
        },
      });
    }

    return this.prisma.buyerRequirement.create({
      data: {
        buyerId: buyer.id,
        commodity: dto.commodity.trim(),
        variety: dto.variety,
        requiredQuantity: dto.requiredQuantity,
        unit: dto.unit || 'QUINTAL',
        targetPrice: dto.targetPrice ?? undefined,
        deliveryLocation: dto.deliveryLocation,
        deliveryLatitude: dto.deliveryLatitude,
        deliveryLongitude: dto.deliveryLongitude,
        maxDistanceKm: dto.maxDistanceKm,
        notes: dto.notes,
        status: 'OPEN',
      },
    });
  }

  async getMyRequirements(userId: string) {
    const buyer = await this.prisma.buyerProfile.findUnique({
      where: { userId },
    });
    if (!buyer) {
      return [];
    }

    return this.prisma.buyerRequirement.findMany({
      where: { buyerId: buyer.id },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getOpenRequirements(commodity?: string, limit: number = 20) {
    const take = Math.min(Math.max(1, limit), 50);
    return this.prisma.buyerRequirement.findMany({
      where: {
        status: 'OPEN',
        commodity: commodity
          ? { contains: commodity.trim(), mode: 'insensitive' }
          : undefined,
      },
      include: {
        buyer: {
          select: {
            id: true,
            businessName: true,
            buyerType: true,
            verificationStatus: true,
          },
        },
      },
      take,
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateStatus(userId: string, requirementId: string, status: string) {
    const req = await this.prisma.buyerRequirement.findUnique({
      where: { id: requirementId },
      include: { buyer: true },
    });

    if (!req) {
      throw new NotFoundException('Buyer requirement not found');
    }

    if (req.buyer.userId !== userId) {
      throw new ForbiddenException('You are not authorized to update this requirement');
    }

    return this.prisma.buyerRequirement.update({
      where: { id: requirementId },
      data: { status },
    });
  }
}

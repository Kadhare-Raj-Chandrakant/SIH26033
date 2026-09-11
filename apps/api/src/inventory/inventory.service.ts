import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { Prisma } from '@prisma/client';

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Initializes inventory for a newly created product
   */
  async initializeInventory(productId: string, initialQuantity: Prisma.Decimal | number, tx?: Prisma.TransactionClient) {
    const prismaClient = tx || this.prisma;
    return prismaClient.inventory.create({
      data: {
        productId,
        availableQuantity: initialQuantity,
        reservedQuantity: 0,
      },
    });
  }

  /**
   * Updates available inventory quantity safely
   * We don't implement reservation logic in MVP, but we support incrementing/decrementing available stock.
   */
  async updateAvailableQuantity(productId: string, delta: number) {
    // We do this via an atomic update, but also ensure it doesn't drop below 0
    // Prisma allows atomic increments/decrements. We will read first to check constraints
    // if delta is negative.
    
    return this.prisma.$transaction(async (tx) => {
      const inventory = await tx.inventory.findUnique({
        where: { productId },
      });

      if (!inventory) {
        throw new NotFoundException('Inventory record not found for this product');
      }

      const newAvailable = inventory.availableQuantity.toNumber() + delta;

      if (newAvailable < 0) {
        throw new BadRequestException('Insufficient inventory available');
      }

      return tx.inventory.update({
        where: { productId },
        data: {
          availableQuantity: new Prisma.Decimal(newAvailable),
        },
      });
    });
  }
}

import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { AddToCartDto } from './dto/add-to-cart.dto.js';
import { UpdateCartItemDto } from './dto/update-cart-item.dto.js';
import { Prisma, ProductStatus } from '@prisma/client';

@Injectable()
export class CartService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Internal helper to resolve the BuyerProfile for the authenticated user
   */
  async resolveBuyerProfile(userId: string) {
    const buyer = await this.prisma.buyerProfile.findUnique({
      where: { userId },
    });
    if (!buyer) {
      throw new ForbiddenException(
        'Buyer profile not found. Only registered buyers can access cart functionality.',
      );
    }
    return buyer;
  }

  /**
   * Add a product to the buyer's cart
   */
  async addToCart(userId: string, dto: AddToCartDto) {
    const buyer = await this.resolveBuyerProfile(userId);

    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
      include: {
        inventory: true,
        images: {
          where: { isPrimary: true },
          take: 1,
        },
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    if (product.status !== ProductStatus.ACTIVE) {
      throw new BadRequestException('Product is not active or available for purchase');
    }

    const availableStock = product.inventory ? product.inventory.availableQuantity.toNumber() : 0;

    if (availableStock <= 0) {
      throw new BadRequestException('Product is currently out of stock');
    }

    // Check existing cart item to prevent exceeding available stock on increment
    const existingItem = await this.prisma.cartItem.findUnique({
      where: {
        buyerId_productId: {
          buyerId: buyer.id,
          productId: dto.productId,
        },
      },
    });

    const targetQuantity = (existingItem ? existingItem.quantity.toNumber() : 0) + dto.quantity;

    if (targetQuantity > availableStock) {
      throw new BadRequestException(
        `Requested quantity (${targetQuantity}) exceeds available stock (${availableStock})`,
      );
    }

    const item = await this.prisma.cartItem.upsert({
      where: {
        buyerId_productId: {
          buyerId: buyer.id,
          productId: dto.productId,
        },
      },
      create: {
        buyerId: buyer.id,
        productId: dto.productId,
        quantity: new Prisma.Decimal(targetQuantity),
      },
      update: {
        quantity: new Prisma.Decimal(targetQuantity),
      },
    });

    return {
      id: item.id,
      productId: item.productId,
      quantity: item.quantity.toNumber(),
      updatedAt: item.updatedAt,
    };
  }

  /**
   * Retrieve the authenticated buyer's cart with calculated line totals, safe projections, and subtotal
   */
  async getCart(userId: string) {
    const buyer = await this.resolveBuyerProfile(userId);

    const items = await this.prisma.cartItem.findMany({
      where: { buyerId: buyer.id },
      include: {
        product: {
          include: {
            images: {
              where: { isPrimary: true },
              take: 1,
            },
            seller: {
              select: {
                id: true,
                sellerType: true,
                businessName: true,
                farmLocation: true,
                verificationStatus: true,
              },
            },
            inventory: {
              select: {
                availableQuantity: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    let subtotal = new Prisma.Decimal(0);

    const mappedItems = items.map((item) => {
      const unitPrice = item.product.price;
      const quantity = item.quantity;
      const lineTotal = quantity.mul(unitPrice);
      const availableStock = item.product.inventory
        ? item.product.inventory.availableQuantity.toNumber()
        : 0;
      const isAvailable =
        item.product.status === ProductStatus.ACTIVE &&
        availableStock >= quantity.toNumber();

      subtotal = subtotal.add(lineTotal);

      return {
        id: item.id,
        productId: item.productId,
        productName: item.product.name,
        unit: item.product.unit,
        unitPrice: unitPrice.toNumber(),
        quantity: quantity.toNumber(),
        lineTotal: lineTotal.toNumber(),
        availableStock,
        isAvailable,
        productStatus: item.product.status,
        image: item.product.images[0]?.url || null,
        seller: {
          id: item.product.seller.id,
          sellerType: item.product.seller.sellerType,
          businessName: item.product.seller.businessName,
          farmLocation: item.product.seller.farmLocation,
          verificationStatus: item.product.seller.verificationStatus,
        },
      };
    });

    return {
      items: mappedItems,
      itemCount: mappedItems.length,
      subtotal: subtotal.toNumber(),
    };
  }

  /**
   * Update quantity of a specific product in the buyer's cart
   */
  async updateCartItem(userId: string, productId: string, dto: UpdateCartItemDto) {
    const buyer = await this.resolveBuyerProfile(userId);

    const item = await this.prisma.cartItem.findUnique({
      where: {
        buyerId_productId: {
          buyerId: buyer.id,
          productId,
        },
      },
      include: {
        product: {
          include: { inventory: true },
        },
      },
    });

    if (!item) {
      throw new NotFoundException('Product not found in your cart');
    }

    if (item.product.status !== ProductStatus.ACTIVE) {
      throw new BadRequestException('Product is not currently available for purchase');
    }

    const availableStock = item.product.inventory
      ? item.product.inventory.availableQuantity.toNumber()
      : 0;

    if (dto.quantity > availableStock) {
      throw new BadRequestException(
        `Requested quantity (${dto.quantity}) exceeds available stock (${availableStock})`,
      );
    }

    const updated = await this.prisma.cartItem.update({
      where: { id: item.id },
      data: {
        quantity: new Prisma.Decimal(dto.quantity),
      },
    });

    return {
      id: updated.id,
      productId: updated.productId,
      quantity: updated.quantity.toNumber(),
      updatedAt: updated.updatedAt,
    };
  }

  /**
   * Remove a single item from the buyer's cart
   */
  async removeCartItem(userId: string, productId: string) {
    const buyer = await this.resolveBuyerProfile(userId);

    const item = await this.prisma.cartItem.findUnique({
      where: {
        buyerId_productId: {
          buyerId: buyer.id,
          productId,
        },
      },
    });

    if (!item) {
      throw new NotFoundException('Product not found in your cart');
    }

    await this.prisma.cartItem.delete({
      where: { id: item.id },
    });

    return { message: 'Item removed from cart successfully' };
  }

  /**
   * Clear all items from the buyer's cart
   */
  async clearCart(userId: string) {
    const buyer = await this.resolveBuyerProfile(userId);

    await this.prisma.cartItem.deleteMany({
      where: { buyerId: buyer.id },
    });

    return { message: 'Cart cleared successfully' };
  }
}

import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateOrderDto } from './dto/create-order.dto.js';
import { OrderQueryDto } from './dto/order-query.dto.js';
import { Prisma, OrderStatus, ProductStatus } from '@prisma/client';

@Injectable()
export class OrdersService {
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
        'Buyer profile not found. Only registered buyers can perform this action.',
      );
    }
    return buyer;
  }

  /**
   * Internal helper to resolve the SellerProfile for the authenticated user
   */
  async resolveSellerProfile(userId: string) {
    const seller = await this.prisma.sellerProfile.findUnique({
      where: { userId },
    });
    if (!seller) {
      throw new ForbiddenException(
        'Seller profile not found. Only registered sellers can access seller orders.',
      );
    }
    return seller;
  }

  /**
   * Transactional Order Creation from Cart
   */
  async createOrder(userId: string, dto: CreateOrderDto) {
    return this.prisma.$transaction(async (tx) => {
      // 1. Resolve BuyerProfile
      const buyer = await tx.buyerProfile.findUnique({
        where: { userId },
      });
      if (!buyer) {
        throw new ForbiddenException(
          'Buyer profile not found. Only registered buyers can create orders.',
        );
      }

      // 2. Resolve requested shipping address and verify ownership
      const address = await tx.address.findFirst({
        where: { id: dto.addressId, userId },
      });
      if (!address) {
        throw new BadRequestException('Shipping address not found or does not belong to buyer');
      }

      // 3. Load cart items for buyer
      const cartItems = await tx.cartItem.findMany({
        where: { buyerId: buyer.id },
        include: {
          product: {
            include: {
              inventory: true,
              seller: true,
            },
          },
        },
      });

      if (cartItems.length === 0) {
        throw new BadRequestException('Your cart is empty. Cannot create an order from an empty cart.');
      }

      // 4. Validate every item, its status, and inventory availability with atomic row locks
      for (const item of cartItems) {
        if (item.product.status !== ProductStatus.ACTIVE) {
          throw new BadRequestException(
            `Product "${item.product.name}" is no longer active for purchase.`,
          );
        }

        // Atomic inventory reservation: decrement availableQuantity, increment reservedQuantity
        const reservation = await tx.inventory.updateMany({
          where: {
            productId: item.productId,
            availableQuantity: { gte: item.quantity },
          },
          data: {
            availableQuantity: { decrement: item.quantity },
            reservedQuantity: { increment: item.quantity },
          },
        });

        if (reservation.count === 0) {
          throw new BadRequestException(
            `Insufficient available stock for product "${item.product.name}".`,
          );
        }
      }

      // 5. Build shipping address snapshot
      const shippingAddressSnapshot = {
        name: address.name,
        phone: address.phone,
        addressLine: address.addressLine,
        city: address.city,
        state: address.state,
        pincode: address.pincode,
        country: address.country,
      };

      // 6. Partition cart items by sellerId (multi-seller checkout support)
      const itemsBySeller = new Map<string, typeof cartItems>();
      for (const item of cartItems) {
        const sId = item.product.sellerId;
        if (!itemsBySeller.has(sId)) {
          itemsBySeller.set(sId, []);
        }
        itemsBySeller.get(sId)!.push(item);
      }

      // 7. Create Orders per seller
      const createdOrders = [];
      let sellerIndex = 0;
      for (const [sellerId, items] of itemsBySeller.entries()) {
        sellerIndex++;
        let orderTotal = new Prisma.Decimal(0);
        const orderItemsData = [];

        for (const item of items) {
          const unitPrice = item.product.price; // authoritative DB price
          const totalPrice = item.quantity.mul(unitPrice);
          orderTotal = orderTotal.add(totalPrice);

          orderItemsData.push({
            productId: item.productId,
            quantity: item.quantity,
            unitPrice,
            totalPrice,
          });
        }

        const orderNumber = `ORD-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}-${sellerIndex}`;

        const order = await tx.order.create({
          data: {
            orderNumber,
            buyerId: buyer.id,
            sellerId,
            status: OrderStatus.PENDING,
            totalAmount: orderTotal,
            shippingAddressSnapshot,
            items: {
              create: orderItemsData,
            },
          },
          include: {
            items: {
              include: {
                product: {
                  select: {
                    id: true,
                    name: true,
                    unit: true,
                    images: { where: { isPrimary: true }, take: 1 },
                  },
                },
              },
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
          },
        });

        createdOrders.push(order);
      }

      // 8. Clear the buyer's cart items
      await tx.cartItem.deleteMany({
        where: { buyerId: buyer.id },
      });

      const grandTotal = createdOrders.reduce(
        (acc, o) => acc.add(o.totalAmount),
        new Prisma.Decimal(0),
      );

      const formattedOrders = createdOrders.map((order) => ({
        id: order.id,
        orderNumber: order.orderNumber,
        sellerId: order.sellerId,
        status: order.status,
        totalAmount: order.totalAmount.toNumber(),
        shippingAddressSnapshot: order.shippingAddressSnapshot,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        seller: order.seller,
        items: order.items.map((item) => ({
          id: item.id,
          productId: item.productId,
          productName: item.product.name,
          unit: item.product.unit,
          quantity: item.quantity.toNumber(),
          unitPrice: item.unitPrice.toNumber(),
          totalPrice: item.totalPrice.toNumber(),
          image: item.product.images[0]?.url || null,
        })),
      }));

      return {
        orders: formattedOrders,
        order: formattedOrders[0],
        count: formattedOrders.length,
        totalAmount: grandTotal.toNumber(),
      };
    });
  }

  /**
   * Get paginated orders for the authenticated buyer
   */
  async getBuyerOrders(userId: string, query: OrderQueryDto) {
    const buyer = await this.resolveBuyerProfile(userId);
    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where: { buyerId: buyer.id },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  unit: true,
                  images: { where: { isPrimary: true }, take: 1 },
                },
              },
            },
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
        },
      }),
      this.prisma.order.count({
        where: { buyerId: buyer.id },
      }),
    ]);

    const formattedOrders = orders.map((order) => ({
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      totalAmount: order.totalAmount.toNumber(),
      shippingAddressSnapshot: order.shippingAddressSnapshot,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      itemCount: order.items.length,
      seller: order.seller,
      items: order.items.map((item) => ({
        id: item.id,
        productId: item.productId,
        productName: item.product.name,
        unit: item.product.unit,
        quantity: item.quantity.toNumber(),
        unitPrice: item.unitPrice.toNumber(),
        totalPrice: item.totalPrice.toNumber(),
        image: item.product.images[0]?.url || null,
      })),
    }));

    return {
      orders: formattedOrders,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get single order detail for the authenticated buyer (IDOR protected)
   */
  async getBuyerOrderById(userId: string, orderId: string) {
    const buyer = await this.resolveBuyerProfile(userId);

    const order = await this.prisma.order.findFirst({
      where: {
        id: orderId,
        buyerId: buyer.id,
      },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                unit: true,
                images: { where: { isPrimary: true }, take: 1 },
              },
            },
          },
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
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found or does not belong to you');
    }

    return {
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      totalAmount: order.totalAmount.toNumber(),
      shippingAddressSnapshot: order.shippingAddressSnapshot,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      seller: order.seller,
      items: order.items.map((item) => ({
        id: item.id,
        productId: item.productId,
        productName: item.product.name,
        unit: item.product.unit,
        quantity: item.quantity.toNumber(),
        unitPrice: item.unitPrice.toNumber(),
        totalPrice: item.totalPrice.toNumber(),
        image: item.product.images[0]?.url || null,
      })),
    };
  }

  /**
   * Cancel an order in PENDING or CONFIRMED state and restore reserved inventory atomically
   */
  async cancelOrder(userId: string, orderId: string) {
    return this.prisma.$transaction(async (tx) => {
      const buyer = await tx.buyerProfile.findUnique({
        where: { userId },
      });
      if (!buyer) {
        throw new ForbiddenException('Buyer profile not found.');
      }

      const order = await tx.order.findFirst({
        where: {
          id: orderId,
          buyerId: buyer.id,
        },
        include: {
          items: true,
        },
      });

      if (!order) {
        throw new NotFoundException('Order not found or does not belong to you');
      }

      if (order.status !== OrderStatus.PENDING && order.status !== OrderStatus.CONFIRMED) {
        throw new BadRequestException(
          `Order cannot be cancelled in status ${order.status}. Only PENDING or CONFIRMED orders can be cancelled.`,
        );
      }

      // Update order status
      const updatedOrder = await tx.order.update({
        where: { id: order.id },
        data: { status: OrderStatus.CANCELLED },
      });

      // Restore inventory atomically: increment availableQuantity, decrement reservedQuantity
      for (const item of order.items) {
        await tx.inventory.updateMany({
          where: { productId: item.productId },
          data: {
            availableQuantity: { increment: item.quantity },
            reservedQuantity: { decrement: item.quantity },
          },
        });
      }

      return {
        message: 'Order cancelled successfully',
        orderId: updatedOrder.id,
        status: updatedOrder.status,
      };
    });
  }

  /**
   * Seller visibility: retrieve orders received containing products belonging to authenticated seller
   */
  async getSellerOrders(userId: string, query: OrderQueryDto) {
    const seller = await this.resolveSellerProfile(userId);
    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where: { sellerId: seller.id },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  unit: true,
                  images: { where: { isPrimary: true }, take: 1 },
                },
              },
            },
          },
          buyer: {
            select: {
              id: true,
              buyerType: true,
              businessName: true,
            },
          },
        },
      }),
      this.prisma.order.count({
        where: { sellerId: seller.id },
      }),
    ]);

    const formattedOrders = orders.map((order) => ({
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      totalAmount: order.totalAmount.toNumber(),
      shippingAddressSnapshot: order.shippingAddressSnapshot,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      buyer: {
        id: order.buyer.id,
        buyerType: order.buyer.buyerType,
        businessName: order.buyer.businessName,
      },
      items: order.items.map((item) => ({
        id: item.id,
        productId: item.productId,
        productName: item.product.name,
        unit: item.product.unit,
        quantity: item.quantity.toNumber(),
        unitPrice: item.unitPrice.toNumber(),
        totalPrice: item.totalPrice.toNumber(),
        image: item.product.images[0]?.url || null,
      })),
    }));

    return {
      orders: formattedOrders,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}

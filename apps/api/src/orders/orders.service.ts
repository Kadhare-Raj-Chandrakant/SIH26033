import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateOrderDto } from './dto/create-order.dto.js';
import { OrderQueryDto } from './dto/order-query.dto.js';
import { ShipOrderDto } from './dto/ship-order.dto.js';
import { Prisma, OrderStatus, ProductStatus, NotificationType, ShipmentStatus } from '@prisma/client';
import { LogisticsService } from '../logistics/logistics.service.js';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly logisticsService: LogisticsService,
  ) {}

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

        const itemPrice = item.product.price ? item.product.price.toNumber() : 0;
        const hasValidPrice =
          itemPrice > 0 &&
          (item.product.illustrativeFarmerListingReferenceInr === null ||
            item.product.illustrativeFarmerListingReferenceInr === undefined ||
            item.product.illustrativeFarmerListingReferenceInr.toNumber() > 0);

        if (!hasValidPrice) {
          throw new BadRequestException(
            `Product "${item.product.name}" has no price assigned and is out of stock. Cannot create order.`,
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
                    primaryImage: true,
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
          image: item.product.primaryImage || item.product.images[0]?.url || null,
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
                  primaryImage: true,
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
        image: item.product.primaryImage || item.product.images[0]?.url || null,
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
                primaryImage: true,
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
        shipment: {
          include: {
            events: {
              orderBy: { occurredAt: 'asc' },
            },
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
      shipment: order.shipment
        ? {
            id: order.shipment.id,
            provider: order.shipment.provider,
            trackingNumber: order.shipment.trackingNumber,
            status: order.shipment.status,
            estimatedDeliveryAt: order.shipment.estimatedDeliveryAt,
            shippedAt: order.shipment.shippedAt,
            deliveredAt: order.shipment.deliveredAt,
            events: order.shipment.events.map((event) => ({
              id: event.id,
              status: event.status,
              location: event.location,
              message: event.message,
              occurredAt: event.occurredAt,
            })),
          }
        : null,
      items: order.items.map((item) => ({
        id: item.id,
        productId: item.productId,
        productName: item.product.name,
        unit: item.product.unit,
        quantity: item.quantity.toNumber(),
        unitPrice: item.unitPrice.toNumber(),
        totalPrice: item.totalPrice.toNumber(),
        image: item.product.primaryImage || item.product.images[0]?.url || null,
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
                  primaryImage: true,
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
          shipment: true,
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
      shipment: order.shipment
        ? {
            id: order.shipment.id,
            provider: order.shipment.provider,
            trackingNumber: order.shipment.trackingNumber,
            status: order.shipment.status,
            estimatedDeliveryAt: order.shipment.estimatedDeliveryAt,
            shippedAt: order.shipment.shippedAt,
            deliveredAt: order.shipment.deliveredAt,
          }
        : null,
      items: order.items.map((item) => ({
        id: item.id,
        productId: item.productId,
        productName: item.product.name,
        unit: item.product.unit,
        quantity: item.quantity.toNumber(),
        unitPrice: item.unitPrice.toNumber(),
        totalPrice: item.totalPrice.toNumber(),
        image: item.product.primaryImage || item.product.images[0]?.url || null,
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
   * Seller: get single order detail with shipment tracking
   */
  async getSellerOrderById(userId: string, orderId: string) {
    const seller = await this.resolveSellerProfile(userId);
    const order = await this.prisma.order.findFirst({
      where: {
        id: orderId,
        sellerId: seller.id,
      },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                unit: true,
                primaryImage: true,
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
        shipment: {
          include: {
            events: {
              orderBy: { occurredAt: 'asc' },
            },
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found or does not belong to your seller profile');
    }

    return {
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      totalAmount: order.totalAmount.toNumber(),
      shippingAddressSnapshot: order.shippingAddressSnapshot,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      buyer: order.buyer,
      shipment: order.shipment
        ? {
            id: order.shipment.id,
            provider: order.shipment.provider,
            trackingNumber: order.shipment.trackingNumber,
            status: order.shipment.status,
            estimatedDeliveryAt: order.shipment.estimatedDeliveryAt,
            shippedAt: order.shipment.shippedAt,
            deliveredAt: order.shipment.deliveredAt,
            events: order.shipment.events.map((e) => ({
              id: e.id,
              status: e.status,
              location: e.location,
              message: e.message,
              occurredAt: e.occurredAt,
            })),
          }
        : null,
      items: order.items.map((item) => ({
        id: item.id,
        productId: item.productId,
        productName: item.product.name,
        unit: item.product.unit,
        quantity: item.quantity.toNumber(),
        unitPrice: item.unitPrice.toNumber(),
        totalPrice: item.totalPrice.toNumber(),
        image: item.product.primaryImage || item.product.images[0]?.url || null,
      })),
    };
  }

  /**
   * Seller fulfillment: Confirm order (PENDING -> CONFIRMED)
   */
  async confirmOrder(userId: string, orderId: string) {
    const seller = await this.resolveSellerProfile(userId);
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, sellerId: seller.id },
      include: { buyer: true },
    });

    if (!order) {
      throw new NotFoundException('Order not found or does not belong to your seller profile');
    }

    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestException(
        `Order cannot be confirmed in status ${order.status}. Only PENDING orders can be confirmed.`,
      );
    }

    const updated = await this.prisma.order.update({
      where: { id: order.id },
      data: { status: OrderStatus.CONFIRMED },
    });

    await this.createNotificationSafe(
      order.buyer.userId,
      NotificationType.ORDER_STATUS_UPDATED,
      'Order Confirmed',
      `Your order ${order.orderNumber} has been confirmed by the producer and will enter processing soon.`,
    );

    return {
      message: 'Order confirmed successfully',
      orderId: updated.id,
      status: updated.status,
    };
  }

  /**
   * Seller fulfillment: Start processing order (CONFIRMED -> PROCESSING)
   */
  async processOrder(userId: string, orderId: string) {
    const seller = await this.resolveSellerProfile(userId);
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, sellerId: seller.id },
      include: { buyer: true },
    });

    if (!order) {
      throw new NotFoundException('Order not found or does not belong to your seller profile');
    }

    if (order.status !== OrderStatus.CONFIRMED) {
      throw new BadRequestException(
        `Order cannot be marked as processing in status ${order.status}. Only CONFIRMED orders can move to PROCESSING.`,
      );
    }

    const updated = await this.prisma.order.update({
      where: { id: order.id },
      data: { status: OrderStatus.PROCESSING },
    });

    await this.createNotificationSafe(
      order.buyer.userId,
      NotificationType.ORDER_STATUS_UPDATED,
      'Order In Preparation',
      `Your order ${order.orderNumber} is now being harvested, cleaned, and packed for shipment.`,
    );

    return {
      message: 'Order processing started',
      orderId: updated.id,
      status: updated.status,
    };
  }

  /**
   * Seller fulfillment: Mark order ready for carrier pickup (PROCESSING -> READY_FOR_SHIPMENT)
   */
  async markReadyForShipment(userId: string, orderId: string) {
    const seller = await this.resolveSellerProfile(userId);
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, sellerId: seller.id },
      include: { buyer: true },
    });

    if (!order) {
      throw new NotFoundException('Order not found or does not belong to your seller profile');
    }

    if (order.status !== OrderStatus.PROCESSING) {
      throw new BadRequestException(
        `Order cannot be marked ready for shipment in status ${order.status}. Only PROCESSING orders can move to READY_FOR_SHIPMENT.`,
      );
    }

    const updated = await this.prisma.order.update({
      where: { id: order.id },
      data: { status: OrderStatus.READY_FOR_SHIPMENT },
    });

    await this.createNotificationSafe(
      order.buyer.userId,
      NotificationType.ORDER_STATUS_UPDATED,
      'Order Ready for Dispatch',
      `Your order ${order.orderNumber} is packaged and waiting for logistics carrier pickup.`,
    );

    return {
      message: 'Order marked ready for shipment',
      orderId: updated.id,
      status: updated.status,
    };
  }

  /**
   * Seller fulfillment: Dispatch order via logistics provider adapter (READY_FOR_SHIPMENT -> SHIPPED)
   */
  /**
   * Seller fulfillment: Dispatch order via logistics provider adapter (READY_FOR_SHIPMENT -> SHIPPED)
   *
   * Decoupled transaction boundary architecture:
   * Phase 1: Concurrency check & staging in short DB transaction (commits before external network call).
   * Phase 2: External provider network call completely OUTSIDE any PostgreSQL transaction.
   * Phase 3: Short DB transaction to persist provider response, advance order to SHIPPED, and notify buyer.
   * Reconciliation: Idempotently retries if provider created consignment but local persistence failed.
   */
  async shipOrder(userId: string, orderId: string, dto?: ShipOrderDto) {
    // 1. Ownership & order state validation
    const seller = await this.resolveSellerProfile(userId);
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, sellerId: seller.id },
      include: {
        items: { include: { product: true } },
        seller: { include: { user: true } },
        buyer: true,
        shipment: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found or does not belong to your seller profile');
    }

    if (order.status !== OrderStatus.READY_FOR_SHIPMENT) {
      throw new BadRequestException(
        `Order cannot be shipped in status ${order.status}. Only READY_FOR_SHIPMENT orders can be dispatched.`,
      );
    }

    // Check if shipment already exists
    let existingShipment = order.shipment;
    let providerShipmentIdAlreadyCreated: string | null = null;
    let trackingNumberAlreadyCreated: string | null = null;

    if (existingShipment) {
      if (
        existingShipment.status === ShipmentStatus.DELIVERED ||
        existingShipment.status === ShipmentStatus.IN_TRANSIT ||
        existingShipment.status === ShipmentStatus.OUT_FOR_DELIVERY ||
        existingShipment.status === ShipmentStatus.PICKED_UP
      ) {
        throw new BadRequestException('Shipment has already been created for this order.');
      }

      // Check if a previous attempt successfully received carrier details but failed Phase 3 persistence
      if (existingShipment.providerShipmentId && existingShipment.trackingNumber) {
        this.logger.log(
          `Reconciliation mode activated for order ${order.id}: found pre-existing carrier reference ${existingShipment.providerShipmentId}`,
        );
        providerShipmentIdAlreadyCreated = existingShipment.providerShipmentId;
        trackingNumberAlreadyCreated = existingShipment.trackingNumber;
      }
    }

    // 2. Prepare logistics payload
    const shippingAddress = order.shippingAddressSnapshot as Record<string, any>;
    const payload = {
      orderId: order.id,
      orderNumber: order.orderNumber,
      idempotencyKey: `SHIP-${order.id}`,
      pickupAddress: {
        name: order.seller.businessName || 'Farmer Producer Origin',
        phone: order.seller.user?.mobile || '9999999999',
        addressLine: order.seller.farmLocation || 'Farm Origin Warehouse',
        city: 'Hubballi',
        state: 'Karnataka',
        pincode: '580020',
        country: 'India',
      },
      deliveryAddress: {
        name: shippingAddress.name || 'Buyer',
        phone: shippingAddress.phone || '0000000000',
        addressLine: shippingAddress.addressLine || 'Delivery Address',
        city: shippingAddress.city || 'Destination City',
        state: shippingAddress.state || 'Destination State',
        pincode: shippingAddress.pincode || '000000',
        country: shippingAddress.country || 'India',
      },
      items: order.items.map((i) => ({
        name: i.product.name,
        quantity: i.quantity.toNumber(),
        unit: i.product.unit,
      })),
      simulateFailure: dto?.simulateFailure,
    };

    // =========================================================================
    // PHASE 1: Staging & Concurrency Lock via Short PostgreSQL Transaction
    // (Commits immediately to release DB locks before external network call)
    // =========================================================================
    if (!existingShipment) {
      try {
        existingShipment = await this.prisma.$transaction(async (tx) => {
          const freshOrder = await tx.order.findUnique({
            where: { id: order.id },
            include: { shipment: true },
          });

          if (!freshOrder || freshOrder.status !== OrderStatus.READY_FOR_SHIPMENT) {
            throw new BadRequestException('Order status is no longer READY_FOR_SHIPMENT.');
          }

          if (freshOrder.shipment) {
            throw new BadRequestException('Shipment has already been initiated for this order.');
          }

          return await tx.shipment.create({
            data: {
              orderId: order.id,
              provider: this.logisticsService.getProviderName(),
              status: ShipmentStatus.CREATED,
            },
          });
        });
      } catch (err: any) {
        if (err instanceof BadRequestException) {
          throw err;
        }
        // Unique constraint violation on Shipment.orderId or parallel collision
        if (err?.code === 'P2002') {
          throw new BadRequestException(
            'Concurrent dispatch detected: A shipment is already being processed for this order.',
          );
        }
        throw err;
      }
    } else if (existingShipment.status === ShipmentStatus.FAILED && !providerShipmentIdAlreadyCreated) {
      // Reset failed attempt to CREATED in a short update
      existingShipment = await this.prisma.shipment.update({
        where: { id: existingShipment.id },
        data: { status: ShipmentStatus.CREATED, updatedAt: new Date() },
      });
    }

    // =========================================================================
    // PHASE 2: External Carrier Call (OUTSIDE PostgreSQL Transaction)
    // =========================================================================
    let shipmentResult: {
      provider: string;
      providerShipmentId: string;
      trackingNumber: string;
      status: ShipmentStatus;
      estimatedDeliveryAt: Date;
    };

    if (providerShipmentIdAlreadyCreated && trackingNumberAlreadyCreated) {
      // Consignment was already created on the carrier in prior attempt; reuse it
      shipmentResult = {
        provider: existingShipment.provider || this.logisticsService.getProviderName(),
        providerShipmentId: providerShipmentIdAlreadyCreated,
        trackingNumber: trackingNumberAlreadyCreated,
        status: ShipmentStatus.PICKED_UP,
        estimatedDeliveryAt:
          existingShipment.estimatedDeliveryAt || new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      };
    } else {
      try {
        shipmentResult = await this.logisticsService.createShipment(payload);
      } catch (providerError: any) {
        // Provider creation failed!
        // Mark local shipment as FAILED so seller can safely retry; keep Order in READY_FOR_SHIPMENT.
        this.logger.warn(
          `External logistics carrier dispatch failed for order ${order.id}: ${providerError.message}`,
        );

        try {
          await this.prisma.shipment.update({
            where: { id: existingShipment.id },
            data: { status: ShipmentStatus.FAILED },
          });
        } catch (updateErr: any) {
          this.logger.error(`Failed to record FAILED status on shipment: ${updateErr.message}`);
        }

        throw providerError;
      }
    }

    // =========================================================================
    // PHASE 3: Persist Provider Response & Advance Order (Short DB Transaction)
    // =========================================================================
    try {
      if (dto?.simulatePersistenceFailure) {
        throw new Error('Simulated database persistence failure after carrier success');
      }

      return await this.prisma.$transaction(async (tx) => {
        const updatedShipment = await tx.shipment.update({
          where: { id: existingShipment!.id },
          data: {
            provider: shipmentResult.provider,
            providerShipmentId: shipmentResult.providerShipmentId,
            trackingNumber: shipmentResult.trackingNumber,
            status: shipmentResult.status,
            estimatedDeliveryAt: shipmentResult.estimatedDeliveryAt,
            shippedAt: new Date(),
            events: {
              create: {
                status: shipmentResult.status,
                location: `${payload.pickupAddress.city}, ${payload.pickupAddress.state}`,
                message: `Shipment dispatched via ${shipmentResult.provider}. Consignment tracking number: ${shipmentResult.trackingNumber}`,
                providerEventId: `INIT-${shipmentResult.providerShipmentId}`,
              },
            },
          },
          include: { events: true },
        });

        const updatedOrder = await tx.order.update({
          where: { id: order.id },
          data: { status: OrderStatus.SHIPPED },
        });

        await tx.notification.create({
          data: {
            userId: order.buyer.userId,
            type: NotificationType.ORDER_STATUS_UPDATED,
            title: 'Order Dispatched',
            message: `Your order ${order.orderNumber} has been dispatched! Tracking number: ${updatedShipment.trackingNumber}`,
          },
        });

        return {
          message: 'Order dispatched and shipment created successfully',
          orderId: updatedOrder.id,
          status: updatedOrder.status,
          shipment: {
            id: updatedShipment.id,
            provider: updatedShipment.provider,
            providerShipmentId: updatedShipment.providerShipmentId,
            trackingNumber: updatedShipment.trackingNumber,
            status: updatedShipment.status,
            estimatedDeliveryAt: updatedShipment.estimatedDeliveryAt,
            shippedAt: updatedShipment.shippedAt,
          },
        };
      });
    } catch (persistenceError: any) {
      // CRITICAL RECONCILIATION CASE:
      // Carrier created external consignment, but local database transaction failed!
      this.logger.error(
        `CRITICAL RECONCILIATION REQUIRED: Provider shipment created (${shipmentResult.providerShipmentId}, tracking: ${shipmentResult.trackingNumber}) but local persistence failed for order ${order.id}: ${persistenceError.message}`,
      );

      // Emergency preserve provider references on local shipment so they are NEVER lost
      try {
        await this.prisma.shipment.update({
          where: { id: existingShipment.id },
          data: {
            providerShipmentId: shipmentResult.providerShipmentId,
            trackingNumber: shipmentResult.trackingNumber,
            status: ShipmentStatus.CREATED,
          },
        });
      } catch (err: any) {
        this.logger.error(`Failed to emergency-record provider references: ${err.message}`);
      }

      // DO NOT pretend operation succeeded! Order remains READY_FOR_SHIPMENT.
      throw new InternalServerErrorException(
        `Logistics carrier dispatch succeeded with reference ${shipmentResult.providerShipmentId}, but local order state could not be updated. Please retry the request to reconcile.`,
      );
    }
  }

  /**
   * Sync shipment tracking status from logistics carrier (Idempotent & non-regressive)
   */
  async syncShipmentStatus(userId: string, orderId: string) {
    // Allows seller or buyer of this order to trigger status synchronization
    const order = await this.prisma.order.findFirst({
      where: {
        id: orderId,
        OR: [
          { seller: { userId } },
          { buyer: { userId } },
        ],
      },
      include: {
        shipment: {
          include: { events: true },
        },
        buyer: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found or you do not have permission to sync its shipment');
    }

    if (!order.shipment || !order.shipment.providerShipmentId) {
      throw new BadRequestException('Order has no active or dispatched shipment to synchronize.');
    }

    // Query carrier for status
    const statusResult = await this.logisticsService.getShipmentStatus(
      order.shipment.providerShipmentId,
      order.shipment.status,
    );

    const rank: Record<ShipmentStatus, number> = {
      CREATED: 1,
      PICKUP_PENDING: 2,
      PICKED_UP: 3,
      IN_TRANSIT: 4,
      OUT_FOR_DELIVERY: 5,
      DELIVERED: 6,
      FAILED: 99,
      CANCELLED: 100,
    };

    const currentRank = rank[order.shipment.status] || 0;
    const newRank = rank[statusResult.status] || 0;
    const isForwardProgression = newRank >= currentRank;

    // Filter out already recorded tracking events by providerEventId
    const existingEventIds = new Set(
      order.shipment.events.map((e) => e.providerEventId).filter(Boolean),
    );
    const newEvents = statusResult.events.filter(
      (e) => !e.providerEventId || !existingEventIds.has(e.providerEventId),
    );

    const mappedOrderStatus = isForwardProgression
      ? this.logisticsService.mapShipmentStatusToOrderStatus(statusResult.status)
      : null;

    return await this.prisma.$transaction(async (tx) => {
      // 1. Insert new tracking events idempotently
      for (const event of newEvents) {
        await tx.shipmentTrackingEvent.create({
          data: {
            shipmentId: order.shipment!.id,
            status: event.status,
            location: event.location,
            message: event.message,
            providerEventId: event.providerEventId,
            occurredAt: event.occurredAt,
          },
        });
      }

      // 2. Update shipment status if moving forward
      const updatedShipment = await tx.shipment.update({
        where: { id: order.shipment!.id },
        data: {
          status: isForwardProgression ? statusResult.status : order.shipment!.status,
          deliveredAt:
            statusResult.status === ShipmentStatus.DELIVERED
              ? order.shipment!.deliveredAt || new Date()
              : order.shipment!.deliveredAt,
        },
        include: {
          events: { orderBy: { occurredAt: 'asc' } },
        },
      });

      // 3. Update order status if forward and not terminal/cancelled
      let updatedOrder = order;
      if (
        mappedOrderStatus &&
        mappedOrderStatus !== order.status &&
        order.status !== OrderStatus.CANCELLED
      ) {
        updatedOrder = (await tx.order.update({
          where: { id: order.id },
          data: { status: mappedOrderStatus },
          include: { buyer: true },
        })) as any;

        // In-app notification on terminal delivery
        if (mappedOrderStatus === OrderStatus.DELIVERED && order.status !== OrderStatus.DELIVERED) {
          await tx.notification.create({
            data: {
              userId: order.buyer.userId,
              type: NotificationType.ORDER_STATUS_UPDATED,
              title: 'Order Delivered',
              message: `Your order ${order.orderNumber} has been delivered successfully!`,
            },
          });
        }
      }

      return {
        message: 'Shipment synchronized successfully',
        orderId: updatedOrder.id,
        orderStatus: updatedOrder.status,
        shipment: {
          id: updatedShipment.id,
          provider: updatedShipment.provider,
          trackingNumber: updatedShipment.trackingNumber,
          status: updatedShipment.status,
          estimatedDeliveryAt: updatedShipment.estimatedDeliveryAt,
          shippedAt: updatedShipment.shippedAt,
          deliveredAt: updatedShipment.deliveredAt,
          events: updatedShipment.events.map((e) => ({
            id: e.id,
            status: e.status,
            location: e.location,
            message: e.message,
            occurredAt: e.occurredAt,
          })),
        },
      };
    });
  }

  /**
   * Buyer: Get complete order tracking information and timeline (IDOR protected)
   */
  async getOrderTracking(userId: string, orderId: string) {
    const buyer = await this.resolveBuyerProfile(userId);
    const order = await this.prisma.order.findFirst({
      where: {
        id: orderId,
        buyerId: buyer.id,
      },
      include: {
        shipment: {
          include: {
            events: {
              orderBy: { occurredAt: 'asc' },
            },
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found or does not belong to your buyer profile');
    }

    return {
      orderId: order.id,
      orderNumber: order.orderNumber,
      orderStatus: order.status,
      shipment: order.shipment
        ? {
            id: order.shipment.id,
            provider: order.shipment.provider,
            trackingNumber: order.shipment.trackingNumber,
            status: order.shipment.status,
            estimatedDeliveryAt: order.shipment.estimatedDeliveryAt,
            shippedAt: order.shipment.shippedAt,
            deliveredAt: order.shipment.deliveredAt,
            events: order.shipment.events.map((e) => ({
              id: e.id,
              status: e.status,
              location: e.location,
              message: e.message,
              occurredAt: e.occurredAt,
            })),
          }
        : null,
    };
  }

  /**
   * Helper for safe, non-blocking notification creation
   */
  private async createNotificationSafe(
    userId: string,
    type: NotificationType,
    title: string,
    message: string,
  ) {
    try {
      await this.prisma.notification.create({
        data: {
          userId,
          type,
          title,
          message,
        },
      });
    } catch {
      // Non-fatal if notification record fails
    }
  }
}

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { UpdateSellerProfileDto } from './dto/update-seller-profile.dto.js';
import { SellerProfile } from '@prisma/client';

@Injectable()
export class SellersService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(userId: string): Promise<SellerProfile> {
    const profile = await this.prisma.sellerProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      throw new NotFoundException('Seller profile not found for this user');
    }

    return profile;
  }

  async updateProfile(userId: string, data: UpdateSellerProfileDto): Promise<SellerProfile> {
    // Ensure profile exists first
    await this.getProfile(userId);

    return this.prisma.sellerProfile.update({
      where: { userId },
      data: {
        businessName: data.businessName,
        farmLocation: data.farmLocation,
      },
    });
  }
}

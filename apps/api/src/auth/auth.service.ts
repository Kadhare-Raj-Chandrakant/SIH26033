import { Injectable, UnauthorizedException, ConflictException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { PrismaService } from '../prisma/prisma.service.js';
import { RegisterDto, LoginDto, ForgotPasswordDto, ResetPasswordDto } from './dto/auth.dto.js';
import { Role } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    if (dto.role === Role.ADMIN) {
      throw new ForbiddenException('Admin registration is not allowed via public endpoint');
    }

    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: dto.email }, ...(dto.mobile ? [{ mobile: dto.mobile }] : [])],
      },
    });

    if (existingUser) {
      throw new ConflictException('User with this email or mobile already exists');
    }

    const passwordHash = await argon2.hash(dto.password);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        mobile: dto.mobile,
        passwordHash,
        role: dto.role,
        // For FARMER or FPO, we initialize the SellerProfile automatically.
        // For BUYER, we initialize the BuyerProfile automatically.
        ...(dto.role === Role.FARMER || dto.role === Role.FPO
          ? {
              sellerProfile: {
                create: {
                  sellerType: dto.role === Role.FARMER ? 'FARMER' : 'FPO',
                  businessName: dto.name,
                },
              },
            }
          : {}),
        ...(dto.role === Role.BUYER
          ? {
              buyerProfile: {
                create: {
                  businessName: dto.name,
                },
              },
            }
          : {}),
      },
    });

    const { passwordHash: _, ...sanitizedUser } = user;
    return sanitizedUser;
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await argon2.verify(user.passwordHash, dto.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.status === 'SUSPENDED') {
      throw new UnauthorizedException('Account is suspended. Please contact platform administration.');
    }

    if (user.status === 'DEACTIVATED') {
      throw new UnauthorizedException('Account has been deactivated. Please contact platform administration.');
    }

    const payload = { sub: user.id, role: user.role };
    
    return {
      accessToken: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        status: user.status,
      },
    };
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        sellerProfile: true,
        buyerProfile: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const { passwordHash: _, ...sanitizedUser } = user;
    return sanitizedUser;
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.trim().toLowerCase() },
    });

    if (!user) {
      return {
        message: 'If an account exists with this email address, a password reset link has been generated.',
      };
    }

    if (user.status === 'SUSPENDED' || user.status === 'DEACTIVATED') {
      throw new UnauthorizedException('Account is inactive. Please contact support.');
    }

    const resetToken = this.jwtService.sign(
      {
        sub: user.id,
        email: user.email,
        type: 'password_reset',
      },
      { expiresIn: '15m' },
    );

    const resetUrl = `http://localhost:3000/reset-password?token=${resetToken}`;
    console.log(`🔑 [Password Reset] Link generated for ${user.email}: ${resetUrl}`);

    return {
      message: 'If an account exists with this email address, a password reset link has been generated.',
      resetToken,
      resetUrl,
    };
  }

  async resetPassword(dto: ResetPasswordDto) {
    let payload: { sub?: string; email?: string; type?: string };
    try {
      payload = this.jwtService.verify(dto.token);
    } catch {
      throw new BadRequestException('Password reset link is invalid or has expired. Please request a new one.');
    }

    if (payload?.type !== 'password_reset' || !payload?.sub) {
      throw new BadRequestException('Invalid password reset token.');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user) {
      throw new BadRequestException('User account no longer exists.');
    }

    const passwordHash = await argon2.hash(dto.newPassword);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });

    return {
      message: 'Password has been reset successfully. You may now log in with your new password.',
    };
  }
}

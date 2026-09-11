import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ForbiddenException, ConflictException, UnauthorizedException } from '@nestjs/common';
import * as argon2 from 'argon2';
import { AuthService } from './auth.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { Role } from '@prisma/client';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: PrismaService;

  const mockPrisma = {
    user: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  };

  const mockJwt = {
    sign: vi.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwt },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('register', () => {
    it('should throw ForbiddenException if role is ADMIN', async () => {
      await expect(
        service.register({
          name: 'Admin',
          email: 'admin@test.com',
          password: 'password123',
          role: Role.ADMIN,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ConflictException if user exists', async () => {
      mockPrisma.user.findFirst.mockResolvedValue({ id: 'existing' });

      await expect(
        service.register({
          name: 'Farmer',
          email: 'farmer@test.com',
          password: 'password123',
          role: Role.FARMER,
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should successfully hash password and create user', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);
      mockPrisma.user.create.mockImplementation((args) => ({
        id: 'new-id',
        email: args.data.email,
        role: args.data.role,
        passwordHash: 'hashed_pw', // Simulated DB return
      }));

      const result = await service.register({
        name: 'Farmer',
        email: 'farmer@test.com',
        password: 'password123',
        role: Role.FARMER,
      });

      expect(prisma.user.create).toHaveBeenCalled();
      // Ensure passwordHash is omitted from return
      expect(result).not.toHaveProperty('passwordHash');
      expect(result.id).toBe('new-id');
      expect(result.role).toBe(Role.FARMER);
    });
  });

  describe('login', () => {
    it('should throw UnauthorizedException if user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.login({ email: 'none@test.com', password: 'password123' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should return token if credentials are valid', async () => {
      const mockHash = await argon2.hash('password123');
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'valid-id',
        email: 'user@test.com',
        passwordHash: mockHash,
        role: Role.BUYER,
        status: 'ACTIVE',
      });
      mockJwt.sign.mockReturnValue('mock.jwt.token');

      const result = await service.login({
        email: 'user@test.com',
        password: 'password123',
      });

      expect(result.accessToken).toBe('mock.jwt.token');
      expect(result.user.id).toBe('valid-id');
    });

    it('should throw UnauthorizedException if password does not match', async () => {
      const mockHash = await argon2.hash('password123');
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'valid-id',
        email: 'user@test.com',
        passwordHash: mockHash,
      });

      await expect(
        service.login({ email: 'user@test.com', password: 'wrongpassword' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { AuditLogService } from './audit-log.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

describe('AuditLogService', () => {
  let service: AuditLogService;

  const mockPrisma = {
    auditLog: {
      create: vi.fn(),
      count: vi.fn(),
      findMany: vi.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditLogService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<AuditLogService>(AuditLogService);
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should sanitize sensitive keys (password, token, hash, secret) before persisting', async () => {
    mockPrisma.auditLog.create.mockResolvedValue({ id: 'log-1' });

    await service.logAction({
      actorUserId: 'admin-1',
      action: 'USER_STATUS_UPDATE',
      entityType: 'USER',
      entityId: 'user-1',
      previousState: {
        email: 'test@example.com',
        passwordHash: 'secret_argon_hash_123',
        status: 'ACTIVE',
      },
      newState: {
        status: 'SUSPENDED',
        apiToken: 'jwt-super-secret-token',
      },
      reason: 'Violation of marketplace policy',
    });

    expect(mockPrisma.auditLog.create).toHaveBeenCalledTimes(1);
    const callArgs = mockPrisma.auditLog.create.mock.calls[0][0];

    expect(callArgs.data.actorUserId).toBe('admin-1');
    expect(callArgs.data.action).toBe('USER_STATUS_UPDATE');
    expect(callArgs.data.previousState.passwordHash).toBe('[REDACTED]');
    expect(callArgs.data.previousState.email).toBe('test@example.com');
    expect(callArgs.data.newState.apiToken).toBe('[REDACTED]');
    expect(callArgs.data.newState.status).toBe('SUSPENDED');
  });

  it('should query audit logs with pagination and filters', async () => {
    mockPrisma.auditLog.count.mockResolvedValue(1);
    mockPrisma.auditLog.findMany.mockResolvedValue([
      {
        id: 'log-1',
        actorUserId: 'admin-1',
        action: 'PRODUCT_MODERATION',
        entityType: 'PRODUCT',
        entityId: 'prod-1',
        createdAt: new Date(),
        actor: { id: 'admin-1', email: 'admin@market.com', role: 'ADMIN' },
      },
    ]);

    const result = await service.findAll({
      page: 1,
      limit: 10,
      action: 'PRODUCT_MODERATION',
      entityType: 'PRODUCT',
    });

    expect(result.data.length).toBe(1);
    expect(result.meta.total).toBe(1);
    expect(result.meta.totalPages).toBe(1);
    expect(mockPrisma.auditLog.findMany).toHaveBeenCalled();
  });
});

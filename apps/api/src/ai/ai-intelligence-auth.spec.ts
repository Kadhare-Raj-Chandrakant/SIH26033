import { describe, it, expect, vi } from 'vitest';
import { Role } from '@prisma/client';
import { AiController } from './ai.controller.js';
import { ROLES_KEY } from '../common/decorators/roles.decorator.js';
import { IS_PUBLIC_KEY } from '../common/decorators/public.decorator.js';

describe('Market Intelligence Authorization & RBAC Verification', () => {
  const mockAiService = {} as any;
  const mockMandiService = {
    getFarmerMandiIntelligence: vi.fn(),
  } as any;
  const mockBulkBuyerService = {
    evaluateBulkRfqsForFpo: vi.fn(),
  } as any;
  const mockMarketplaceLandedCostService = {
    calculateLandedCosts: vi.fn(),
  } as any;

  const controller = new AiController(
    mockAiService,
    mockMandiService,
    mockBulkBuyerService,
    mockMarketplaceLandedCostService,
  );

  it('GET /api/v1/ai/mandi-intelligence must be protected (NOT public) and restrict access to FARMER, FPO, ADMIN', () => {
    const isPublic = Reflect.getMetadata(IS_PUBLIC_KEY, controller.getLocalMandiIntelligence);
    expect(isPublic).toBeUndefined();

    const roles: Role[] = Reflect.getMetadata(ROLES_KEY, controller.getLocalMandiIntelligence);
    expect(roles).toBeDefined();
    expect(roles).toContain(Role.FARMER);
    expect(roles).toContain(Role.FPO);
    expect(roles).toContain(Role.ADMIN);
    expect(roles).not.toContain(Role.BUYER);
  });

  it('GET /api/v1/ai/fpo-bulk-intelligence/:fpoId must be protected (NOT public) and restrict access to FPO, ADMIN, FARMER', () => {
    const isPublic = Reflect.getMetadata(IS_PUBLIC_KEY, controller.getFpoBulkIntelligence);
    expect(isPublic).toBeUndefined();

    const roles: Role[] = Reflect.getMetadata(ROLES_KEY, controller.getFpoBulkIntelligence);
    expect(roles).toBeDefined();
    expect(roles).toContain(Role.FPO);
    expect(roles).toContain(Role.ADMIN);
    expect(roles).toContain(Role.FARMER);
    expect(roles).not.toContain(Role.BUYER);
  });

  it('GET /api/v1/ai/fpo-bulk-intelligence/:fpoId must pass requesting user context to service for ownership and tampering verification', async () => {
    const authUser = {
      sub: 'fpo-admin-123',
      role: Role.FPO,
      email: 'fpo@demo.org',
    };

    await controller.getFpoBulkIntelligence('fpo-target-id', 'Tomato', authUser as any);

    expect(mockBulkBuyerService.evaluateBulkRfqsForFpo).toHaveBeenCalledWith(
      'fpo-target-id',
      'Tomato',
      { id: 'fpo-admin-123', role: Role.FPO },
    );
  });

  it('POST /api/v1/ai/marketplace-landed-cost must be protected (NOT public) and allow BUYER, FARMER, FPO, ADMIN', () => {
    const isPublic = Reflect.getMetadata(IS_PUBLIC_KEY, controller.calculateMarketplaceLandedCost);
    expect(isPublic).toBeUndefined();

    const roles: Role[] = Reflect.getMetadata(ROLES_KEY, controller.calculateMarketplaceLandedCost);
    expect(roles).toBeDefined();
    expect(roles).toContain(Role.BUYER);
    expect(roles).toContain(Role.FARMER);
    expect(roles).toContain(Role.FPO);
    expect(roles).toContain(Role.ADMIN);
  });
});

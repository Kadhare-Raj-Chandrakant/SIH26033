import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { AdminAuditLogQueryDto } from './dto/admin-query.dto.js';
import { Prisma } from '@prisma/client';

export interface LogAuditParams {
  actorUserId: string;
  action: string;
  entityType: string;
  entityId: string;
  previousState?: any;
  newState?: any;
  reason?: string;
  metadata?: any;
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Sanitizes objects by removing sensitive keys such as password, token, secrets, hashes.
   */
  private sanitize(data: any): any {
    if (!data || typeof data !== 'object') {
      return data;
    }

    if (Array.isArray(data)) {
      return data.map((item) => this.sanitize(item));
    }

    const sensitivePattern = /password|hash|token|secret|jwt|key|auth|cvv|card/i;
    const clean: Record<string, any> = {};

    for (const [key, value] of Object.entries(data)) {
      if (sensitivePattern.test(key)) {
        clean[key] = '[REDACTED]';
      } else if (value && typeof value === 'object') {
        clean[key] = this.sanitize(value);
      } else {
        clean[key] = value;
      }
    }

    return clean;
  }

  /**
   * Appends an audit log record for a privileged administrative action.
   */
  async logAction(params: LogAuditParams) {
    try {
      const sanitizedPreviousState = params.previousState ? this.sanitize(params.previousState) : undefined;
      const sanitizedNewState = params.newState ? this.sanitize(params.newState) : undefined;
      const sanitizedMetadata = params.metadata ? this.sanitize(params.metadata) : undefined;

      const record = await this.prisma.auditLog.create({
        data: {
          actorUserId: params.actorUserId,
          action: params.action,
          entityType: params.entityType,
          entityId: params.entityId,
          previousState: sanitizedPreviousState as Prisma.InputJsonValue,
          newState: sanitizedNewState as Prisma.InputJsonValue,
          reason: params.reason,
          metadata: sanitizedMetadata as Prisma.InputJsonValue,
          ipAddress: params.ipAddress,
          userAgent: params.userAgent,
        },
      });

      this.logger.log(
        `Audit record logged: [${params.action}] on ${params.entityType}:${params.entityId} by actor:${params.actorUserId}`,
      );

      return record;
    } catch (err: any) {
      this.logger.error(`Failed to write audit log: ${err?.message || err}`, err?.stack);
      // We do not fail the core transaction, but log the failure
      return null;
    }
  }

  /**
   * Queries audit logs with pagination and filters.
   */
  async findAll(query: AdminAuditLogQueryDto) {
    const page = Number(query.page) || 1;
    const limit = Math.min(Number(query.limit) || 10, 100);
    const skip = (page - 1) * limit;

    const where: Prisma.AuditLogWhereInput = {};

    if (query.actorUserId) {
      where.actorUserId = query.actorUserId;
    }

    if (query.action) {
      where.action = query.action;
    }

    if (query.entityType) {
      where.entityType = query.entityType;
    }

    if (query.entityId) {
      where.entityId = query.entityId;
    }

    if (query.startDate || query.endDate) {
      where.createdAt = {};
      if (query.startDate) {
        where.createdAt.gte = new Date(query.startDate);
      }
      if (query.endDate) {
        where.createdAt.lte = new Date(query.endDate);
      }
    }

    const [total, data] = await Promise.all([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: query.sortOrder || 'desc' },
        include: {
          actor: {
            select: {
              id: true,
              email: true,
              role: true,
            },
          },
        },
      }),
    ]);

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }
}

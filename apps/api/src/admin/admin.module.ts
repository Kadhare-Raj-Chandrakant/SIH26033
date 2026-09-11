import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { AdminService } from './admin.service.js';
import { AuditLogService } from './audit-log.service.js';
import { AdminController } from './admin.controller.js';
import { ReportsController } from './reports.controller.js';

@Module({
  imports: [PrismaModule],
  controllers: [AdminController, ReportsController],
  providers: [AdminService, AuditLogService],
  exports: [AdminService, AuditLogService],
})
export class AdminModule {}

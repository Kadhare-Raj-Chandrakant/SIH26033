import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { AdminModule } from '../admin/admin.module.js';
import { FpoController } from './fpo.controller.js';
import { FpoService } from './fpo.service.js';
import { FpoAdminGuard } from './guards/fpo-admin.guard.js';

@Module({
  imports: [PrismaModule, AdminModule],
  controllers: [FpoController],
  providers: [FpoService, FpoAdminGuard],
  exports: [FpoService],
})
export class FpoModule {}

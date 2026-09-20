import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { Role } from '@prisma/client';
import { AuthUser } from '../../common/decorators/current-user.decorator.js';

@Injectable()
export class FpoAdminGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user as AuthUser;

    if (!user) {
      throw new ForbiddenException('User context missing');
    }

    // Platform administrators have global override access
    if (user.role === Role.ADMIN) {
      return true;
    }

    const fpoId = request.params.id || request.params.fpoId;
    if (!fpoId) {
      return true;
    }

    const fpo = await this.prisma.fpoOrganization.findUnique({
      where: { id: fpoId },
      select: { id: true, adminId: true },
    });

    if (!fpo) {
      throw new NotFoundException(`FPO with ID ${fpoId} not found`);
    }

    if (fpo.adminId !== user.sub) {
      throw new ForbiddenException('You do not have administrative authority over this FPO organization');
    }

    return true;
  }
}

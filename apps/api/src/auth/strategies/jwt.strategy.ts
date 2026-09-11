import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AuthUser } from '../../common/decorators/current-user.decorator.js';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET')!,
    });
  }

  // The return value of this method is automatically attached to req.user
  async validate(payload: any): Promise<AuthUser> {
    if (payload.sub) {
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: { id: true, role: true, status: true },
      });

      if (user) {
        if (user.status === 'SUSPENDED') {
          throw new UnauthorizedException('Account has been suspended by administration');
        }

        if (user.status === 'DEACTIVATED') {
          throw new UnauthorizedException('Account has been deactivated');
        }

        return { sub: user.id, role: user.role };
      }
    }

    return { sub: payload.sub, role: payload.role };
  }
}

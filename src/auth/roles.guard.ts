import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';
import { ROLES_KEY } from './roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const { user } = context.switchToHttp().getRequest();
    if (!user) return false;
    if (user.role === UserRole.developer) return true;

    if (!required || required.length === 0) {
      // Role `warehouse` sengaja dikecualikan dari kebijakan "izinkan siapa pun login"
      // — akses menu di luar Menu Warehouse harus ditolak dari sisi backend (PRD 5.12),
      // bukan cuma disembunyikan di UI. Endpoint yang memang boleh diakses warehouse
      // (mis. GET /assets/by-token) menandainya eksplisit lewat @Roles(UserRole.warehouse).
      return user.role !== UserRole.warehouse;
    }

    return required.includes(user.role);
  }
}

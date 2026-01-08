import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@org/data';
import { JwtUser } from './jwt.strategy';
import { AuditLogger } from './audit-logger.service';
import { ROLES_KEY } from './roles.decorator';
import { hasRoleOrHigher } from './role.utils';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly auditLogger: AuditLogger
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{ user?: JwtUser }>();
    const user = request.user;

    if (!user) {
      this.auditLogger.logAccessDecision({
        action: this.describeContext(context),
        allowed: false,
        requiredRoles,
        reason: 'missing-user',
      });
      throw new ForbiddenException('Missing authentication context');
    }

    const allowed = requiredRoles.some((role) => hasRoleOrHigher(user.role, role));

    this.auditLogger.logAccessDecision({
      userId: user.id,
      action: this.describeContext(context),
      allowed,
      requiredRoles,
      reason: allowed ? undefined : 'insufficient-role',
    });

    if (!allowed) {
      throw new ForbiddenException('Insufficient role');
    }

    return true;
  }

  private describeContext(context: ExecutionContext): string {
    return `${context.getClass().name}.${context.getHandler().name}`;
  }
}

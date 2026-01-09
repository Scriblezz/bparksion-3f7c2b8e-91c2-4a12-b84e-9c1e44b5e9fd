import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtUser } from './jwt.strategy';
import { AuditLogger } from './audit-logger.service';
import { RolesGuard } from './roles.guard';

describe('RolesGuard', () => {
  let reflector: jest.Mocked<Reflector>;
  let auditLogger: jest.Mocked<AuditLogger>;
  let guard: RolesGuard;

  const buildContext = (user?: JwtUser): ExecutionContext => ({
    getClass: () => ({ name: 'SpecController' }),
    getHandler: () => ({ name: 'specHandler' }),
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
    switchToRpc: () => null as any,
    switchToWs: () => null as any,
    getType: () => 'http',
  });

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn(),
    } as unknown as jest.Mocked<Reflector>;

    auditLogger = {
      logAccessDecision: jest.fn(),
      logOrganizationCheck: jest.fn(),
      logOwnershipCheck: jest.fn(),
    } as unknown as jest.Mocked<AuditLogger>;

    guard = new RolesGuard(reflector, auditLogger);
  });

  it('allows access when no roles are specified', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined as any);

    const result = guard.canActivate(buildContext());

    expect(result).toBe(true);
    expect(auditLogger.logAccessDecision).not.toHaveBeenCalled();
  });

  it('denies when metadata requires a role but no user is present', () => {
    reflector.getAllAndOverride.mockReturnValue(['admin']);

    expect(() => guard.canActivate(buildContext())).toThrow(ForbiddenException);
    expect(auditLogger.logAccessDecision).toHaveBeenCalledWith(
      expect.objectContaining({ allowed: false, reason: 'missing-user' })
    );
  });

  it('allows when the user meets at least one required role', () => {
    const user: JwtUser = { id: 1, email: 'test@example.com', role: 'owner', orgId: 1 };
    reflector.getAllAndOverride.mockReturnValue(['admin']);

    const result = guard.canActivate(buildContext(user));

    expect(result).toBe(true);
    expect(auditLogger.logAccessDecision).toHaveBeenCalledWith(
      expect.objectContaining({ allowed: true, userId: user.id })
    );
  });

  it('denies when the user lacks the required role', () => {
    const user: JwtUser = { id: 2, email: 'viewer@example.com', role: 'viewer', orgId: 1 };
    reflector.getAllAndOverride.mockReturnValue(['admin']);

    expect(() => guard.canActivate(buildContext(user))).toThrow(ForbiddenException);
    expect(auditLogger.logAccessDecision).toHaveBeenCalledWith(
      expect.objectContaining({ allowed: false, reason: 'insufficient-role' })
    );
  });
});

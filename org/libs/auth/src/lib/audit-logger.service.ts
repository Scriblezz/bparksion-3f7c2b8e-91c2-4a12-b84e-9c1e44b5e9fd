import { Injectable, Logger } from '@nestjs/common';
import { Role } from '@org/data';

interface AccessLogParams {
  userId?: number;
  action: string;
  allowed: boolean;
  requiredRoles?: Role[];
  reason?: string;
}

interface OrgLogParams {
  userId?: number;
  orgId?: number | null;
  allowed: boolean;
  reason?: string;
}

interface OwnershipLogParams {
  userId?: number;
  ownerId?: number | null;
  allowed: boolean;
  reason?: string;
}

@Injectable()
export class AuditLogger {
  private readonly logger = new Logger('AuthAudit');

  logAccessDecision(params: AccessLogParams) {
    this.logger.log(
      `${params.allowed ? 'ALLOW' : 'DENY'} action=${params.action} user=${params.userId ?? 'anonymous'} roles=${
        params.requiredRoles?.join(',') ?? 'none'
      } reason=${params.reason ?? 'n/a'}`
    );
  }

  logOrganizationCheck(params: OrgLogParams) {
    this.logger.log(
      `${params.allowed ? 'ALLOW' : 'DENY'} org-check user=${params.userId ?? 'anonymous'} org=${
        params.orgId ?? 'n/a'
      } reason=${params.reason ?? 'n/a'}`
    );
  }

  logOwnershipCheck(params: OwnershipLogParams) {
    this.logger.log(
      `${params.allowed ? 'ALLOW' : 'DENY'} owner-check user=${params.userId ?? 'anonymous'} owner=${
        params.ownerId ?? 'n/a'
      } reason=${params.reason ?? 'n/a'}`
    );
  }
}

import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard, JwtUser, Roles, RolesGuard } from '@org/auth';
import { AuditLogService } from './audit-log.service';

@Controller('audit-log')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AuditLogController {
  constructor(private readonly auditLog: AuditLogService) {}

  @Get()
  @Roles('admin', 'owner')
  list(@Req() req: Request & { user: JwtUser }) {
    if (!req.user.orgId) {
      return [];
    }
    return this.auditLog.listForOrganization(req.user.orgId);
  }
}

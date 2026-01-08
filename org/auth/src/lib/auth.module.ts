import { Module } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';
import { JwtStrategy } from './jwt.strategy';
import { RolesGuard } from './roles.guard';
import { AuditLogger } from './audit-logger.service';

@Module({
  providers: [JwtStrategy, JwtAuthGuard, RolesGuard, AuditLogger],
  exports: [JwtStrategy, JwtAuthGuard, RolesGuard, AuditLogger],
})
export class OrgAuthModule {}

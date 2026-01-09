import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLog } from '@org/data';
import { OrgAuthModule } from '@org/auth';
import { AuditLogService } from './audit-log.service';
import { AuditLogController } from './audit-log.controller';

@Module({
  imports: [TypeOrmModule.forFeature([AuditLog]), OrgAuthModule],
  providers: [AuditLogService],
  controllers: [AuditLogController],
  exports: [AuditLogService],
})
export class AuditLogModule {}

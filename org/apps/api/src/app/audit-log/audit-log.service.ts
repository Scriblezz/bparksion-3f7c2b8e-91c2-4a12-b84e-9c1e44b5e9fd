import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { AuditLog, AuditStatus } from '@org/data';
import { Repository } from 'typeorm';

export interface RecordAuditEvent {
  action: string;
  status: AuditStatus;
  userId?: number;
  organizationId?: number;
  resourceType?: string;
  resourceId?: number;
  reason?: string;
  details?: Record<string, unknown>;
}

@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  constructor(@InjectRepository(AuditLog) private readonly repo: Repository<AuditLog>) {}

  async record(event: RecordAuditEvent) {
    try {
      const entry = this.repo.create({
        action: event.action,
        status: event.status,
        userId: event.userId,
        organizationId: event.organizationId,
        resourceType: event.resourceType,
        resourceId: event.resourceId,
        reason: event.reason,
        details: event.details ? JSON.stringify(event.details) : undefined,
      });
      await this.repo.save(entry);
    } catch (error) {
      this.logger.error(`Failed to persist audit log: ${event.action}`, error as Error);
    }
  }

  async listForOrganization(organizationId: number, limit = 100) {
    return this.repo.find({
      where: { organizationId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }
}

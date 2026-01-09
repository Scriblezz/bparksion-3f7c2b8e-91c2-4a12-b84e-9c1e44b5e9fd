import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Task, User } from '@org/data';
import { Repository } from 'typeorm';
import { JwtUser, hasRoleOrHigher, isSameOrganization } from '@org/auth';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { AuditLogService } from '../audit-log/audit-log.service';

@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(Task) private readonly taskRepo: Repository<Task>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    private readonly auditLog: AuditLogService
  ) {}

  private ensureOrg(user: JwtUser): number {
    if (!user.orgId) {
      throw new ForbiddenException('User is not assigned to an organization');
    }
    return user.orgId;
  }

  async create(user: JwtUser, dto: CreateTaskDto) {
    const orgId = this.ensureOrg(user);
    const owner = await this.resolveOwner(user, dto.ownerId ?? user.id);

    const task = this.taskRepo.create({
      title: dto.title,
      description: dto.description,
      status: dto.status ?? 'todo',
      organization: owner.organization!,
      owner,
    });
    const saved = await this.taskRepo.save(task);

    await this.auditLog.record({
      action: 'TASK_CREATE',
      status: 'ALLOW',
      userId: user.id,
      organizationId: orgId,
      resourceType: 'task',
      resourceId: saved.id,
      details: { title: saved.title },
    });

    return saved;
  }

  async findScoped(user: JwtUser) {
    const orgId = this.ensureOrg(user);
    const qb = this.taskRepo
      .createQueryBuilder('task')
      .leftJoinAndSelect('task.owner', 'owner')
      .leftJoinAndSelect('task.organization', 'organization')
      .where('organization.id = :orgId', { orgId })
      .orderBy('task.createdAt', 'DESC');

    if (user.role === 'viewer') {
      qb.andWhere('owner.id = :ownerId', { ownerId: user.id });
    }

    return qb.getMany();
  }

  async update(user: JwtUser, id: number, dto: UpdateTaskDto) {
    const task = await this.findTaskOrThrow(id);
    await this.ensureTaskAccess(user, task, 'TASK_UPDATE');

    if (dto.title !== undefined) task.title = dto.title;
    if (dto.description !== undefined) task.description = dto.description;
    if (dto.status !== undefined) task.status = dto.status;

    if (dto.ownerId && dto.ownerId !== task.owner.id) {
      const newOwner = await this.resolveOwner(user, dto.ownerId);
      task.owner = newOwner;
      task.organization = newOwner.organization!;
    }

    const saved = await this.taskRepo.save(task);

    await this.auditLog.record({
      action: 'TASK_UPDATE',
      status: 'ALLOW',
      userId: user.id,
      organizationId: saved.organization.id,
      resourceType: 'task',
      resourceId: saved.id,
      details: { status: saved.status },
    });

    return saved;
  }

  async remove(user: JwtUser, id: number) {
    const task = await this.findTaskOrThrow(id);
    await this.ensureTaskAccess(user, task, 'TASK_DELETE');

    await this.taskRepo.remove(task);

    await this.auditLog.record({
      action: 'TASK_DELETE',
      status: 'ALLOW',
      userId: user.id,
      organizationId: task.organization.id,
      resourceType: 'task',
      resourceId: id,
      details: { title: task.title },
    });

    return { success: true };
  }

  private async findTaskOrThrow(id: number) {
    const task = await this.taskRepo.findOne({
      where: { id },
      relations: { owner: true, organization: true },
    });
    if (!task) throw new NotFoundException('Task not found');
    return task;
  }

  private async resolveOwner(user: JwtUser, ownerId: number) {
    const owner = await this.userRepo.findOne({
      where: { id: ownerId },
      relations: { organization: true },
    });
    if (!owner) {
      throw new NotFoundException('Owner not found');
    }
    if (!isSameOrganization(user, owner.organization?.id)) {
      await this.recordDeny(user, 'TASK_ASSIGN', owner.organization?.id, ownerId, 'org-mismatch');
      throw new ForbiddenException('Cannot assign outside your organization');
    }
    return owner;
  }

  private async ensureTaskAccess(user: JwtUser, task: Task, action: string) {
    if (!isSameOrganization(user, task.organization.id)) {
      await this.recordDeny(user, action, task.organization.id, task.id, 'org-mismatch');
      throw new ForbiddenException('Cross-organization access denied');
    }

    const allowed = hasRoleOrHigher(user.role, 'admin') || task.owner.id === user.id;
    if (!allowed) {
      await this.recordDeny(user, action, task.organization.id, task.id, 'ownership');
      throw new ForbiddenException('Insufficient permissions');
    }
  }

  private async recordDeny(
    user: JwtUser,
    action: string,
    organizationId?: number,
    resourceId?: number,
    reason?: string
  ) {
    await this.auditLog.record({
      action,
      status: 'DENY',
      userId: user.id,
      organizationId,
      resourceType: 'task',
      resourceId,
      reason,
    });
  }
}

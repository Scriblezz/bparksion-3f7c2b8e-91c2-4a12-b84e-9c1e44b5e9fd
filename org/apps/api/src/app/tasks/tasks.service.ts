import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Task, TaskStatus, User } from '@org/data';
import { In, Repository } from 'typeorm';
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

  private normalizeCategory(category?: string): string {
    if (!category) return 'General';
    const trimmed = category.trim();
    if (!trimmed) return 'General';
    return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
  }

  private async nextPosition(orgId: number, status: TaskStatus): Promise<number> {
    const result = await this.taskRepo
      .createQueryBuilder('task')
      .select('MAX(task.position)', 'max')
      .where('task.organizationId = :orgId', { orgId })
      .andWhere('task.status = :status', { status })
      .getRawOne<{ max: number | null }>();

    return (result?.max ?? -1) + 1;
  }

  async create(user: JwtUser, dto: CreateTaskDto) {
    const orgId = this.ensureOrg(user);
    const owner = await this.resolveOwner(user, dto.ownerId ?? user.id);
    const status = dto.status ?? 'todo';
    const category = this.normalizeCategory(dto.category);
    const position = await this.nextPosition(orgId, status);

    const task = this.taskRepo.create({
      title: dto.title,
      description: dto.description,
      status,
      category,
      position,
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
      .orderBy(
        `CASE task.status WHEN 'todo' THEN 0 WHEN 'in-progress' THEN 1 ELSE 2 END`,
        'ASC'
      )
      .addOrderBy('task.position', 'ASC');

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
    if (dto.category !== undefined) task.category = this.normalizeCategory(dto.category);

    if (dto.status !== undefined && dto.status !== task.status) {
      task.status = dto.status;
      if (dto.position == null) {
        task.position = await this.nextPosition(task.organization.id, task.status);
      }
    }

    if (dto.position != null) {
      task.position = dto.position;
    }

    if (dto.ownerId && dto.ownerId !== task.owner.id) {
      const newOwner = await this.resolveOwner(user, dto.ownerId);
      task.owner = newOwner;
      task.organization = newOwner.organization!;
      task.position = await this.nextPosition(task.organization.id, task.status);
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

  async reorder(user: JwtUser, status: TaskStatus, taskIds: number[]) {
    const orgId = this.ensureOrg(user);
    if (!hasRoleOrHigher(user.role, 'admin')) {
      throw new ForbiddenException('Insufficient permissions');
    }

    if (!taskIds.length) {
      return { success: true };
    }

    const tasks = await this.taskRepo.find({
      where: { id: In(taskIds) },
      relations: { organization: true, owner: true },
    });

    const tasksById = new Map(tasks.map((task) => [task.id, task]));
    for (const id of taskIds) {
      if (!tasksById.has(id)) {
        throw new NotFoundException(`Task ${id} not found`);
      }
    }

    const updates: Task[] = [];
    taskIds.forEach((taskId, index) => {
      const task = tasksById.get(taskId)!;
      if (!isSameOrganization(user, task.organization.id)) {
        throw new ForbiddenException('Cross-organization access denied');
      }
      task.status = status;
      task.position = index;
      updates.push(task);
    });

    await this.taskRepo.save(updates);

    await this.auditLog.record({
      action: 'TASK_REORDER',
      status: 'ALLOW',
      userId: user.id,
      organizationId: orgId,
      resourceType: 'task',
      details: { status, order: taskIds },
    });

    return { success: true };
  }
}

import { ForbiddenException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Task, User, Organization } from '@org/data';
import { JwtUser } from '@org/auth';
import { AuditLogService } from '../audit-log/audit-log.service';
import { TasksService } from './tasks.service';

describe('TasksService', () => {
  let taskRepo: jest.Mocked<Repository<Task>>;
  let userRepo: jest.Mocked<Repository<User>>;
  let auditLog: jest.Mocked<AuditLogService>;
  let service: TasksService;

  const buildTask = (overrides: Partial<Task> = {}): Task => ({
    id: overrides.id ?? 1,
    title: overrides.title ?? 'Test',
    description: overrides.description,
    status: overrides.status ?? 'todo',
    category: overrides.category ?? 'General',
    position: overrides.position ?? 0,
    organization:
      overrides.organization ??
      ({ id: 1, name: 'Org', children: [], parent: null } as unknown as Organization),
    owner:
      overrides.owner ??
      ({
        id: 1,
        email: 'owner@example.com',
        passwordHash: 'hash',
        role: 'owner',
        organization:
          overrides.organization ??
          ({ id: 1, name: 'Org', children: [], parent: null } as unknown as Organization),
      } as unknown as User),
    createdAt: overrides.createdAt ?? new Date(),
    updatedAt: overrides.updatedAt ?? new Date(),
  });

  const adminUser: JwtUser = {
    id: 42,
    email: 'admin@example.com',
    role: 'admin',
    orgId: 1,
  };

  beforeEach(() => {
    taskRepo = {
      find: jest.fn(),
      save: jest.fn(),
      createQueryBuilder: jest.fn(),
      create: jest.fn(),
      remove: jest.fn(),
      findOne: jest.fn(),
    } as unknown as jest.Mocked<Repository<Task>>;

    userRepo = {
      findOne: jest.fn(),
    } as unknown as jest.Mocked<Repository<User>>;

    auditLog = {
      record: jest.fn().mockResolvedValue(undefined),
      listForOrganization: jest.fn(),
    } as unknown as jest.Mocked<AuditLogService>;

    service = new TasksService(taskRepo, userRepo, auditLog);
  });

  describe('reorder', () => {
    it('throws when caller lacks admin-level role', async () => {
      const viewer: JwtUser = { id: 1, email: 'viewer@example.com', role: 'viewer', orgId: 1 };

      await expect(service.reorder(viewer, 'done', [1])).rejects.toThrow(ForbiddenException);
      expect(taskRepo.find).not.toHaveBeenCalled();
    });

    it('throws when user does not belong to an organization', async () => {
      const orphanedUser: JwtUser = { id: 1, email: 'user@example.com', role: 'admin' as const };

      await expect(service.reorder(orphanedUser, 'done', [1])).rejects.toThrow(
        'User is not assigned to an organization'
      );
      expect(taskRepo.find).not.toHaveBeenCalled();
    });

    it('throws when a task belongs to a different organization', async () => {
      const mismatchedTask = buildTask({ id: 5, organization: { id: 2 } as Organization });
      taskRepo.find.mockResolvedValue([mismatchedTask]);

      await expect(service.reorder(adminUser, 'in-progress', [5])).rejects.toThrow(ForbiddenException);
    });

    it('persists new ordering and records an audit entry', async () => {
      const tasks = [
        buildTask({ id: 1, status: 'todo', position: 0 }),
        buildTask({ id: 2, status: 'todo', position: 1 }),
      ];
      taskRepo.find.mockResolvedValue(tasks);
      taskRepo.save.mockResolvedValue(tasks);

      await service.reorder(adminUser, 'in-progress', [2, 1]);

      expect(tasks[0].id).toBe(1);
      expect(tasks[0].position).toBe(1);
      expect(tasks[0].status).toBe('in-progress');
      expect(tasks[1].id).toBe(2);
      expect(tasks[1].position).toBe(0);
      expect(tasks[1].status).toBe('in-progress');
      expect(taskRepo.save).toHaveBeenCalledWith([
        expect.objectContaining({ id: 2, position: 0, status: 'in-progress' }),
        expect.objectContaining({ id: 1, position: 1, status: 'in-progress' }),
      ]);
      expect(auditLog.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'TASK_REORDER', status: 'ALLOW', details: { status: 'in-progress', order: [2, 1] } })
      );
    });
  });
});

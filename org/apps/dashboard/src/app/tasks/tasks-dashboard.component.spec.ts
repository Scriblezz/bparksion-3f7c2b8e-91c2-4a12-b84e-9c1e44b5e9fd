import { computed, signal, WritableSignal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { AuthUser } from '../auth/auth.models';
import { Task } from './tasks.models';
import { TasksService } from './tasks.service';
import { TasksDashboardComponent } from './tasks-dashboard.component';

describe('TasksDashboardComponent', () => {
  let fixture: ComponentFixture<TasksDashboardComponent>;
  let userSignal: WritableSignal<AuthUser>;
  let authStub: { user: ReturnType<typeof computed>; logout: jest.Mock };
  let tasksService: {
    list: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
    reorder: jest.Mock;
  };
  let router: { navigateByUrl: jest.Mock };

  const viewerUser: AuthUser = {
    id: 3,
    email: 'viewer@example.com',
    role: 'viewer',
    orgId: 1,
  };

  const ownerUser: AuthUser = {
    id: 1,
    email: 'owner@example.com',
    role: 'owner',
    orgId: 1,
  };

  beforeEach(async () => {
    userSignal = signal(viewerUser);
    authStub = {
      user: computed(() => userSignal()),
      logout: jest.fn(),
    };

    tasksService = {
      list: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockResolvedValue({}),
      update: jest.fn(),
      delete: jest.fn(),
      reorder: jest.fn().mockResolvedValue({ success: true }),
    };

    router = {
      navigateByUrl: jest.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [TasksDashboardComponent],
      providers: [
        { provide: AuthService, useValue: authStub },
        { provide: TasksService, useValue: tasksService },
        { provide: Router, useValue: router },
      ],
    }).compileComponents();
  });

  async function renderComponent() {
    fixture = TestBed.createComponent(TasksDashboardComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture;
  }

  it('fetches tasks on init and renders cards', async () => {
    const taskList: Task[] = [
      {
        id: 42,
        title: 'Seed task',
        description: 'owned by viewer',
        status: 'todo',
        category: 'General',
        position: 0,
        owner: { id: viewerUser.id, email: viewerUser.email, role: 'viewer' },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];
    tasksService.list.mockResolvedValueOnce(taskList);

    await renderComponent();

    expect(tasksService.list).toHaveBeenCalledTimes(1);
    expect(fixture.componentInstance.tasks()).toEqual(taskList);

    const cards = fixture.nativeElement.querySelectorAll('.task-card');
    expect(cards.length).toBe(1);
    expect(cards[0].textContent).toContain('Seed task');
  });

  it('disables create actions for viewers', async () => {
    await renderComponent();

    const button: HTMLButtonElement = fixture.nativeElement.querySelector(
      '.panels form button[type="submit"]'
    );
    expect(button.disabled).toBe(true);

    await fixture.componentInstance.createTask();
    expect(tasksService.create).not.toHaveBeenCalled();
  });

  it('creates tasks for owners and refreshes the list', async () => {
    userSignal.set(ownerUser);
    const createdTask: Task = {
      id: 101,
      title: 'New task',
      description: 'owner created',
      status: 'todo',
      category: 'General',
      owner: { id: ownerUser.id, email: ownerUser.email, role: 'owner' },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      position: 0,
    };

    tasksService.create.mockResolvedValue(createdTask);

    await renderComponent();

    fixture.componentInstance.createForm.setValue({
      title: 'New task',
      description: 'owner created',
      status: 'todo',
      category: 'General',
    });

    tasksService.list.mockClear();
    await fixture.componentInstance.createTask();

    expect(tasksService.create).toHaveBeenCalledWith({
      title: 'New task',
      description: 'owner created',
      status: 'todo',
      category: 'General',
    });
    expect(tasksService.list).toHaveBeenCalledTimes(1);
  });
});

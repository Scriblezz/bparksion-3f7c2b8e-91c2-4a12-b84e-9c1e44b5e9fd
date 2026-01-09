import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { Task } from './tasks.models';
import { TasksService } from './tasks.service';

@Component({
  selector: 'app-tasks-dashboard',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <section class="layout">
      <header>
        <div>
          <p class="eyebrow">Organization</p>
          <h1>Task Command Center</h1>
        </div>
        <div class="user-chip" *ngIf="user() as current">
          <div>
            <span>{{ current.email }}</span>
            <small>{{ current.role | titlecase }}</small>
          </div>
          <button type="button" (click)="logout()">Logout</button>
        </div>
      </header>

      <div class="content">
        <aside>
          <section>
            <h2>Create task</h2>
            <form [formGroup]="createForm" (ngSubmit)="createTask()">
              <input formControlName="title" placeholder="Title" />
              <textarea formControlName="description" placeholder="Optional description"></textarea>
              <select formControlName="status">
                <option value="todo">To do</option>
                <option value="in-progress">In progress</option>
                <option value="done">Done</option>
              </select>
              <button type="submit" [disabled]="createForm.invalid || isViewer()">
                Create
              </button>
            </form>
            <p class="viewer-hint" *ngIf="isViewer()">
              Viewers cannot create or edit tasks.
            </p>
          </section>

          <section>
            <h2>Audit log</h2>
            <p class="audit-hint">
              Detailed audit history is available on the API at <code>/api/audit-log</code>.
            </p>
          </section>
        </aside>

        <main>
          <div class="toolbar">
            <h2>Open tasks</h2>
            <button type="button" (click)="refresh()">Refresh</button>
          </div>

          <section class="task-list" *ngIf="tasks().length; else emptyState">
            <article *ngFor="let task of tasks()" [class.muted]="isViewer()">
              <header>
                <div>
                  <p class="eyebrow">#{{ task.id }}</p>
                  <h3>{{ task.title }}</h3>
                </div>
                <span class="status" [attr.data-status]="task.status">{{ task.status }}</span>
              </header>
              <p class="description">{{ task.description || 'No description provided.' }}</p>
              <footer>
                <span>Owner: {{ task.owner.email }}</span>
                <div class="actions">
                  <button type="button" [disabled]="isViewer()" (click)="startEdit(task)">Edit</button>
                  <button type="button" [disabled]="isViewer()" (click)="deleteTask(task)">
                    Delete
                  </button>
                </div>
              </footer>
            </article>
          </section>
          <ng-template #emptyState>
            <div class="empty">
              <p>No tasks yet. Create the first one and it will appear here.</p>
            </div>
          </ng-template>
        </main>
      </div>

      <section class="drawer" *ngIf="editingTask() as edit">
        <header>
          <h2>Edit task</h2>
          <button type="button" (click)="closeEditor()">×</button>
        </header>
        <form [formGroup]="editForm" (ngSubmit)="saveEdit(edit)">
          <input formControlName="title" placeholder="Title" />
          <textarea formControlName="description" placeholder="Optional description"></textarea>
          <select formControlName="status">
            <option value="todo">To do</option>
            <option value="in-progress">In progress</option>
            <option value="done">Done</option>
          </select>
          <div class="drawer-actions">
            <button type="submit" [disabled]="editForm.invalid">Save changes</button>
            <button type="button" (click)="closeEditor()">Cancel</button>
          </div>
        </form>
      </section>
    </section>
  `,
  styles: [
    `
      :host {
        display: block;
        min-height: 100vh;
        background: radial-gradient(circle at top, #eef2ff, #e0e7ff, #fdf2f8);
        color: #0f172a;
      }

      .layout {
        padding: 2rem clamp(1rem, 4vw, 3rem) 4rem;
        display: flex;
        flex-direction: column;
        gap: 2rem;
      }

      header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        flex-wrap: wrap;
        gap: 1rem;
      }

      .eyebrow {
        font-size: 0.75rem;
        letter-spacing: 0.2em;
        text-transform: uppercase;
        color: #6366f1;
        margin: 0 0 0.35rem;
      }

      h1 {
        margin: 0;
        font-size: clamp(2rem, 4vw, 3rem);
      }

      .user-chip {
        display: flex;
        align-items: center;
        gap: 1rem;
        padding: 0.75rem 1rem;
        border-radius: 999px;
        background: rgba(99, 102, 241, 0.08);
      }

      .user-chip button {
        border: none;
        background: transparent;
        color: #ef4444;
        cursor: pointer;
      }

      .content {
        display: grid;
        grid-template-columns: minmax(260px, 320px) 1fr;
        gap: 1.5rem;
        align-items: start;
      }

      aside {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
      }

      aside section {
        background: white;
        border-radius: 1.25rem;
        padding: 1.5rem;
        box-shadow: 0 20px 50px rgba(15, 23, 42, 0.08);
      }

      form {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
      }

      input,
      textarea,
      select {
        border-radius: 0.85rem;
        border: 1px solid #cbd5f5;
        padding: 0.65rem 0.85rem;
        font: inherit;
        resize: vertical;
      }

      button[type='submit'],
      .toolbar button,
      .drawer-actions button:first-child {
        border: none;
        border-radius: 999px;
        padding: 0.65rem 1.5rem;
        font-weight: 600;
        background: linear-gradient(135deg, #6366f1, #a855f7);
        color: white;
        cursor: pointer;
      }

      button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      .viewer-hint,
      .audit-hint {
        font-size: 0.85rem;
        color: #64748b;
        margin: 0;
      }

      .toolbar {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1rem;
      }

      .task-list {
        display: grid;
        gap: 1rem;
      }

      article {
        background: white;
        border-radius: 1.25rem;
        padding: 1.5rem;
        box-shadow: 0 15px 40px rgba(15, 23, 42, 0.08);
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
      }

      article header {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .status {
        padding: 0.35rem 0.85rem;
        border-radius: 999px;
        font-size: 0.8rem;
        text-transform: uppercase;
        letter-spacing: 0.08em;
      }

      .status[data-status='todo'] {
        background: rgba(251, 191, 36, 0.15);
        color: #b45309;
      }

      .status[data-status='in-progress'] {
        background: rgba(59, 130, 246, 0.15);
        color: #1d4ed8;
      }

      .status[data-status='done'] {
        background: rgba(34, 197, 94, 0.15);
        color: #15803d;
      }

      .description {
        margin: 0;
        color: #475569;
      }

      footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .actions {
        display: flex;
        gap: 0.5rem;
      }

      .actions button {
        border: 1px solid rgba(15, 23, 42, 0.1);
        background: transparent;
        color: #0f172a;
        border-radius: 999px;
        padding: 0.35rem 0.95rem;
      }

      .empty {
        border: 2px dashed rgba(99, 102, 241, 0.4);
        border-radius: 1.25rem;
        padding: 3rem 1rem;
        text-align: center;
        color: #4c1d95;
        background: white;
      }

      .drawer {
        position: fixed;
        right: 2rem;
        bottom: 2rem;
        width: min(420px, 90vw);
        background: white;
        border-radius: 1.25rem;
        box-shadow: 0 25px 50px rgba(15, 23, 42, 0.25);
        padding: 1.5rem;
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }

      .drawer header {
        justify-content: space-between;
      }

      .drawer header button {
        border: none;
        background: transparent;
        font-size: 1.5rem;
        cursor: pointer;
      }

      .drawer-actions {
        display: flex;
        gap: 0.5rem;
      }

      .drawer-actions button:last-child {
        border: none;
        border-radius: 999px;
        padding: 0.65rem 1.5rem;
        background: rgba(15, 23, 42, 0.06);
        cursor: pointer;
      }

      @media (max-width: 900px) {
        .content {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class TasksDashboardComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly tasksService = inject(TasksService);
  private readonly router = inject(Router);

  readonly tasks = signal<Task[]>([]);
  readonly editingTask = signal<Task | null>(null);

  readonly user = this.auth.user;
  readonly isViewer = computed(() => this.auth.user()?.role === 'viewer');

  readonly createForm = this.fb.nonNullable.group({
    title: ['', Validators.required],
    description: [''],
    status: ['todo' as Task['status'], Validators.required],
  });

  readonly editForm = this.fb.nonNullable.group({
    title: ['', Validators.required],
    description: [''],
    status: ['todo' as Task['status'], Validators.required],
  });

  ngOnInit(): void {
    this.refresh();
  }

  async refresh(): Promise<void> {
    const list = await this.tasksService.list();
    this.tasks.set(list);
  }

  async createTask(): Promise<void> {
    if (this.createForm.invalid || this.isViewer()) return;
    const payload = this.createForm.getRawValue();
    await this.tasksService.create(payload);
    this.createForm.reset({ title: '', description: '', status: 'todo' });
    await this.refresh();
  }

  startEdit(task: Task): void {
    if (this.isViewer()) return;
    this.editingTask.set(task);
    this.editForm.setValue({
      title: task.title,
      description: task.description ?? '',
      status: task.status,
    });
  }

  closeEditor(): void {
    this.editingTask.set(null);
  }

  async saveEdit(task: Task): Promise<void> {
    if (this.editForm.invalid) return;
    const payload = this.editForm.getRawValue();
    await this.tasksService.update(task.id, payload);
    this.closeEditor();
    await this.refresh();
  }

  async deleteTask(task: Task): Promise<void> {
    if (this.isViewer()) return;
    await this.tasksService.delete(task.id);
    await this.refresh();
  }

  logout(): void {
    this.auth.logout();
    this.router.navigateByUrl('/login');
  }
}

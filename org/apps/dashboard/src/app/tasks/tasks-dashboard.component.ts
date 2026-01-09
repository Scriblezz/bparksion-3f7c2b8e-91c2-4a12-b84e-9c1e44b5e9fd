import { CommonModule } from '@angular/common';
import { CdkDragDrop, DragDropModule, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { Component, ElementRef, HostListener, OnInit, ViewChild, computed, effect, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { Task } from './tasks.models';
import { TasksService } from './tasks.service';

const THEME_STORAGE_KEY = 'org-dashboard-theme';

@Component({
  selector: 'app-tasks-dashboard',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, DragDropModule],
  template: `
    <section class="layout" [attr.data-theme]="theme()">
      <header class="hero">
        <div>
          <p class="eyebrow">Organization</p>
          <h1>Task Command Center</h1>
          <p class="subtitle">
            Sort, categorize, and drag tasks across swimlanes. Everything stays in sync with the API.
          </p>
        </div>
        <div class="hero-actions">
          <button type="button" class="theme-toggle" (click)="toggleTheme()">
            <span *ngIf="theme() === 'light'">Dark mode</span>
            <span *ngIf="theme() === 'dark'">Light mode</span>
          </button>
          <div class="user-chip" *ngIf="user() as current">
            <div>
              <span>{{ current.email }}</span>
              <small>{{ current.role | titlecase }}</small>
            </div>
            <button type="button" (click)="logout()">Logout</button>
          </div>
        </div>
      </header>

      <section class="filters">
        <div class="filter">
          <label>Status</label>
          <select [value]="statusFilter()" (change)="changeStatusFilter($any($event.target).value)">
            <option value="all">All statuses</option>
            <option *ngFor="let option of statusOptions" [value]="option.value">
              {{ option.title }}
            </option>
          </select>
        </div>
        <div class="filter">
          <label>Category</label>
          <select [value]="categoryFilter()" (change)="changeCategoryFilter($any($event.target).value)">
            <option value="all">All categories</option>
            <option *ngFor="let category of categoryOptions()" [value]="category">
              {{ category }}
            </option>
          </select>
        </div>
        <div class="filter">
          <label>Sort</label>
          <select [value]="sortMode()" (change)="changeSortMode($any($event.target).value)">
            <option value="position">Manual (drag order)</option>
            <option value="createdDesc">Newest first</option>
            <option value="createdAsc">Oldest first</option>
            <option value="titleAsc">Title A→Z</option>
            <option value="titleDesc">Title Z→A</option>
          </select>
        </div>
        <div class="filter search">
          <label>Search</label>
          <input type="search" placeholder="Search title or owner" [value]="searchTerm()" (input)="searchTerm.set($any($event.target).value)" />
        </div>
        <button type="button" class="refresh" (click)="refresh()">Refresh</button>
      </section>

      <section class="insights">
        <article class="chart-card">
          <header>
            <h2>Completion overview</h2>
            <small>{{ completionStats().done }} / {{ completionStats().total }} tasks done ({{ completionStats().percentComplete }}%)</small>
          </header>
          <div class="bars">
            <div class="bar" *ngFor="let bar of completionStats().bars">
              <div class="label">
                <span>{{ bar.label }}</span>
                <small>{{ bar.count }} ({{ bar.percent }}%)</small>
              </div>
              <div class="track">
                <div class="fill" [style.width.%]="bar.percent" [attr.data-status]="bar.status"></div>
              </div>
            </div>
          </div>
        </article>

        <article class="shortcuts-card">
          <header>
            <h2>Keyboard shortcuts</h2>
            <small>Designed for speedy admins and owners.</small>
          </header>
          <ul>
            <li *ngFor="let shortcut of hotkeys">
              <span class="kbd-group">
                <ng-container *ngFor="let key of shortcut.keys; let last = last">
                  <kbd>{{ key }}</kbd>
                  <span class="plus" *ngIf="!last">+</span>
                </ng-container>
              </span>
              <span>{{ shortcut.description }}</span>
            </li>
          </ul>
        </article>
      </section>

      <section class="panels">
        <article>
          <header>
            <h2>Create task</h2>
            <small>Assign categories like Work or Personal to keep things organized.</small>
          </header>
          <form [formGroup]="createForm" (ngSubmit)="createTask()">
            <input formControlName="title" placeholder="Title" #createTitleInput />
            <textarea formControlName="description" placeholder="Optional description"></textarea>
            <div class="form-row">
              <select formControlName="status">
                <option value="todo">To do</option>
                <option value="in-progress">In progress</option>
                <option value="done">Done</option>
              </select>
              <select formControlName="category">
                <option *ngFor="let preset of categoryPresets" [value]="preset">{{ preset }}</option>
              </select>
            </div>
            <button type="submit" [disabled]="createForm.invalid || isViewer()">Create</button>
            <p class="viewer-hint" *ngIf="isViewer()">Viewers cannot create or edit tasks.</p>
          </form>
        </article>

        <article>
          <header>
            <h2>Audit log</h2>
            <small>Owners/Admins can query <code>/api/audit-log</code> for full history.</small>
          </header>
          <p>Recent reorders and edits are automatically persisted for org-level auditing.</p>
        </article>
      </section>

      <section class="board" cdkDropListGroup>
        <p class="drag-hint" *ngIf="dragDisabled()">
          Drag-and-drop is available for Admin/Owner when manual sort is active.
        </p>
        <ng-container *ngIf="columns().length; else emptyState">
          <article class="column" *ngFor="let column of columns()">
            <header>
              <div>
                <p class="eyebrow">{{ column.title }}</p>
                <h3>{{ column.tasks.length }} task{{ column.tasks.length === 1 ? '' : 's' }}</h3>
              </div>
              <span class="pill" [style.background]="column.accent">{{ column.status }}</span>
            </header>

            <div
              class="dropzone"
              cdkDropList
              [id]="column.status"
              [cdkDropListData]="column.tasks"
              [cdkDropListConnectedTo]="connectedListIds()"
              [cdkDropListDisabled]="dragDisabled()"
              (cdkDropListDropped)="handleDrop($event, column.status)"
            >
              <article class="task-card" *ngFor="let task of column.tasks" cdkDrag [class.viewer]="isViewer()">
                <header>
                  <div>
                    <p class="eyebrow">#{{ task.id }}</p>
                    <h4>{{ task.title }}</h4>
                  </div>
                  <span class="category">{{ task.category }}</span>
                </header>
                <p class="description">{{ task.description || 'No description provided.' }}</p>
                <footer>
                  <span>Owner: {{ task.owner.email }}</span>
                  <div class="actions">
                    <button type="button" [disabled]="isViewer()" (click)="startEdit(task)">Edit</button>
                    <button type="button" [disabled]="isViewer()" (click)="deleteTask(task)">Delete</button>
                  </div>
                </footer>
              </article>

              <p class="empty-column" *ngIf="!column.tasks.length">
                Drop tasks here to start this lane.
              </p>
            </div>
          </article>
        </ng-container>
      </section>

      <ng-template #emptyState>
        <div class="empty">
          <p>No tasks yet. Create the first one and it will appear in the board.</p>
        </div>
      </ng-template>

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
          <select formControlName="category">
            <option *ngFor="let preset of categoryPresets" [value]="preset">{{ preset }}</option>
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
        --bg: radial-gradient(circle at top, #eef2ff, #e0e7ff, #fdf2f8);
        --text: #0f172a;
        --muted: #475569;
        --card-bg: #ffffff;
        --chip-bg: rgba(99, 102, 241, 0.08);
        --border: #cbd5f5;
        --shadow: 0 20px 40px rgba(15, 23, 42, 0.08);
        --button-gradient: linear-gradient(135deg, #6366f1, #a855f7);
      }

      .layout[data-theme='dark'] {
        --bg: radial-gradient(circle at top, #0b1120, #0f172a, #111827);
        --text: #f8fafc;
        --muted: #cbd5f5;
        --card-bg: rgba(15, 23, 42, 0.92);
        --chip-bg: rgba(99, 102, 241, 0.15);
        --border: rgba(148, 163, 184, 0.6);
        --shadow: 0 25px 60px rgba(2, 6, 23, 0.75);
        --button-gradient: linear-gradient(135deg, #22d3ee, #818cf8);
      }

      .layout {
        padding: clamp(1.5rem, 4vw, 3rem);
        display: flex;
        flex-direction: column;
        gap: 2rem;
        min-height: 100vh;
        background: var(--bg);
        color: var(--text);
      }

      .hero {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        flex-wrap: wrap;
        gap: 1.25rem;
      }

      .hero-actions {
        display: flex;
        align-items: center;
        gap: 0.75rem;
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

      .subtitle {
        margin: 0;
        color: var(--muted);
      }

      .user-chip {
        display: flex;
        align-items: center;
        gap: 1rem;
        padding: 0.75rem 1rem;
        border-radius: 999px;
        background: var(--chip-bg);
      }

      .user-chip button {
        border: none;
        background: transparent;
        color: #ef4444;
        cursor: pointer;
      }

      .theme-toggle {
        border: 1px solid var(--border);
        border-radius: 999px;
        padding: 0.5rem 1rem;
        background: transparent;
        color: var(--text);
        cursor: pointer;
      }

      .filters {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
        gap: 1rem;
        align-items: end;
      }

      .filter {
        display: flex;
        flex-direction: column;
        gap: 0.35rem;
        font-size: 0.85rem;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: #475569;
      }

      .filter select,
      .filter input {
        border-radius: 0.85rem;
        border: 1px solid var(--border);
        padding: 0.55rem 0.75rem;
        font: inherit;
        background: white;
      }

      .filter.search {
        grid-column: span 2;
      }

      .refresh {
        border: none;
        border-radius: 999px;
        padding: 0.65rem 1.5rem;
        font-weight: 600;
        background: var(--button-gradient);
        color: white;
        cursor: pointer;
        height: fit-content;
      }

      .insights {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
        gap: 1rem;
      }

      .chart-card,
      .shortcuts-card {
        background: var(--card-bg);
        border-radius: 1.25rem;
        padding: 1.5rem;
        box-shadow: var(--shadow);
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
      }

      .bars {
        display: flex;
        flex-direction: column;
        gap: 0.85rem;
      }

      .bar .label {
        display: flex;
        justify-content: space-between;
        font-size: 0.85rem;
        color: var(--muted);
      }

      .track {
        height: 0.65rem;
        border-radius: 999px;
        background: rgba(99, 102, 241, 0.15);
        overflow: hidden;
      }

      .fill {
        height: 100%;
        border-radius: 999px;
        background: linear-gradient(135deg, #6366f1, #a855f7);
        transition: width 0.2s ease;
      }

      .fill[data-status='done'] {
        background: linear-gradient(135deg, #34d399, #10b981);
      }

      .shortcuts-card ul {
        list-style: none;
        padding: 0;
        margin: 0;
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
      }

      .shortcuts-card li {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 1rem;
        font-size: 0.95rem;
      }

      .kbd-group {
        display: flex;
        align-items: center;
        gap: 0.35rem;
      }

      kbd {
        border: 1px solid var(--border);
        border-radius: 6px;
        padding: 0.2rem 0.5rem;
        font-size: 0.85rem;
        background: rgba(99, 102, 241, 0.12);
      }

      .plus {
        color: var(--muted);
      }

      .panels {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
        gap: 1.25rem;
      }

      .panels article {
        background: var(--card-bg);
        border-radius: 1.25rem;
        padding: 1.5rem;
        box-shadow: var(--shadow);
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
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
        border: 1px solid var(--border);
        padding: 0.65rem 0.85rem;
        font: inherit;
        resize: vertical;
      }

      button[type='submit'],
      .drawer-actions button:first-child {
        border: none;
        border-radius: 999px;
        padding: 0.65rem 1.5rem;
        font-weight: 600;
        background: var(--button-gradient);
        color: white;
        cursor: pointer;
      }

      button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      .viewer-hint,
      .audit-hint,
      .drag-hint {
        font-size: 0.85rem;
        color: var(--muted);
        margin: 0;
      }
      .board {
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }

      .board .column {
        background: var(--card-bg);
        border-radius: 1.25rem;
        padding: 1.25rem;
        box-shadow: var(--shadow);
      }

      .column header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 1rem;
      }

      .pill {
        padding: 0.35rem 0.85rem;
        border-radius: 999px;
        font-size: 0.8rem;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: white;
      }

      .dropzone {
        min-height: 150px;
        margin-top: 1rem;
        display: flex;
        flex-direction: column;
        gap: 0.85rem;
      }

      .task-card {
        background: color-mix(in srgb, var(--card-bg) 90%, white);
        border-radius: 1.15rem;
        padding: 1rem;
        box-shadow: 0 12px 30px rgba(15, 23, 42, 0.07);
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }

      .task-card header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
      }

      .category {
        padding: 0.25rem 0.75rem;
        border-radius: 999px;
        background: rgba(99, 102, 241, 0.12);
        font-size: 0.75rem;
      }

      .task-card footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
        flex-wrap: wrap;
        gap: 0.75rem;
      }

      .actions {
        display: flex;
        gap: 0.5rem;
      }

      .actions button {
        border: 1px solid rgba(15, 23, 42, 0.1);
        background: transparent;
        color: var(--text);
        border-radius: 999px;
        padding: 0.35rem 0.95rem;
      }

      .empty {
        border: 2px dashed rgba(99, 102, 241, 0.4);
        border-radius: 1.25rem;
        padding: 3rem 1rem;
        text-align: center;
        color: #4c1d95;
        background: var(--card-bg);
      }

      .empty-column {
        border: 1px dashed rgba(99, 102, 241, 0.3);
        border-radius: 1rem;
        padding: 1.5rem;
        text-align: center;
        color: #6366f1;
      }

      .drawer {
        position: fixed;
        right: 2rem;
        bottom: 2rem;
        width: min(420px, 90vw);
        background: var(--card-bg);
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
        .filters {
          grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
        }
        .filter.search {
          grid-column: span 1;
        }
        .insights {
          grid-template-columns: 1fr;
        }
        .panels {
          grid-template-columns: 1fr;
        }
        .board .column {
          padding: 1rem;
        }
        .drawer {
          right: 1rem;
          left: 1rem;
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

  @ViewChild('createTitleInput') createTitleInput?: ElementRef<HTMLInputElement>;

  readonly tasks = signal<Task[]>([]);
  readonly columns = signal<BoardColumn[]>([]);
  readonly connectedListIds = computed(() => this.columns().map((column) => column.status));
  readonly editingTask = signal<Task | null>(null);

  readonly user = this.auth.user;
  readonly isViewer = computed(() => this.auth.user()?.role === 'viewer');

  readonly theme = signal<Theme>(this.readThemePreference());

  readonly statusOptions = STATUS_META;
  readonly categoryPresets = ['General', 'Work', 'Personal', 'Urgent'];

  readonly statusFilter = signal<'all' | Task['status']>('all');
  readonly categoryFilter = signal<'all' | string>('all');
  readonly sortMode = signal<SortMode>('position');
  readonly searchTerm = signal('');

  readonly categoryOptions = computed(() => {
    const map = new Map<string, string>();
    const collect = (value: string) => {
      const trimmed = value?.trim();
      if (!trimmed) return;
      const key = trimmed.toLowerCase();
      const formatted = trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
      if (!map.has(key)) {
        map.set(key, formatted);
      }
    };

    this.categoryPresets.forEach(collect);
    this.tasks().forEach((task) => collect(task.category));

    return Array.from(map.values()).sort((a, b) => a.localeCompare(b));
  });

  readonly dragDisabled = computed(() => this.isViewer() || this.sortMode() !== 'position');

  readonly completionStats = computed(() => {
    const counts = STATUS_META.map((meta) => ({
      status: meta.status,
      label: meta.title,
      count: this.tasks().filter((task) => task.status === meta.status).length,
    }));
    const total = counts.reduce((acc, item) => acc + item.count, 0);
    const done = counts.find((item) => item.status === 'done')?.count ?? 0;
    const bars = counts.map((item) => ({
      ...item,
      percent: total === 0 ? 0 : Math.round((item.count / total) * 100),
    }));

    return {
      bars,
      total,
      done,
      percentComplete: total === 0 ? 0 : Math.round((done / total) * 100),
    };
  });

  readonly hotkeys = HOTKEYS;

  readonly createForm = this.fb.nonNullable.group({
    title: ['', Validators.required],
    description: [''],
    status: ['todo' as Task['status'], Validators.required],
    category: ['General', Validators.required],
  });

  readonly editForm = this.fb.nonNullable.group({
    title: ['', Validators.required],
    description: [''],
    status: ['todo' as Task['status'], Validators.required],
    category: ['General', Validators.required],
  });

  constructor() {
    effect(() => {
      this.tasks();
      this.statusFilter();
      this.categoryFilter();
      this.sortMode();
      this.searchTerm();
      this.columns.set(this.buildColumns());
    });

    effect(() => {
      this.persistTheme(this.theme());
    });
  }

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
    this.createForm.reset({ title: '', description: '', status: 'todo', category: 'General' });
    await this.refresh();
    this.focusNewTaskField();
  }

  startEdit(task: Task): void {
    if (this.isViewer()) return;
    this.editingTask.set(task);
    this.editForm.setValue({
      title: task.title,
      description: task.description ?? '',
      status: task.status,
      category: task.category,
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

  toggleTheme(): void {
    const next = this.theme() === 'light' ? 'dark' : 'light';
    this.theme.set(next);
  }

  changeStatusFilter(value: string) {
    this.statusFilter.set(value as 'all' | Task['status']);
  }

  changeCategoryFilter(value: string) {
    this.categoryFilter.set(value as 'all' | string);
  }

  changeSortMode(value: string) {
    this.sortMode.set(value as SortMode);
  }

  @HostListener('document:keydown', ['$event'])
  handleGlobalShortcuts(event: KeyboardEvent) {
    if (event.key === 'Escape' && this.editingTask()) {
      event.preventDefault();
      this.closeEditor();
      return;
    }

    const target = event.target as HTMLElement | null;
    const isTypingTarget = target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
    if (isTypingTarget) {
      return;
    }

    if (!event.shiftKey) {
      return;
    }

    switch (event.key.toLowerCase()) {
      case 'n':
        event.preventDefault();
        this.focusNewTaskField();
        break;
      case 'r':
        event.preventDefault();
        this.refresh();
        break;
      case 't':
        event.preventDefault();
        this.toggleTheme();
        break;
    }
  }

  async handleDrop(event: CdkDragDrop<Task[]>, targetStatus: Task['status']) {
    if (this.dragDisabled()) return;

    try {
      if (event.previousContainer === event.container) {
        moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
        await this.persistColumn(targetStatus, event.container.data);
      } else {
        transferArrayItem(
          event.previousContainer.data,
          event.container.data,
          event.previousIndex,
          event.currentIndex
        );
        const sourceStatus = event.previousContainer.id as Task['status'];
        event.container.data[event.currentIndex].status = targetStatus;
        await Promise.all([
          this.persistColumn(targetStatus, event.container.data),
          this.persistColumn(sourceStatus, event.previousContainer.data),
        ]);
      }
    } finally {
      await this.refresh();
    }
  }

  private focusNewTaskField() {
    this.createTitleInput?.nativeElement.focus();
  }

  private async persistColumn(status: Task['status'], items: Task[]) {
    const ids = items.map((task) => task.id);
    await this.tasksService.reorder(status, ids);
  }

  private buildColumns(): BoardColumn[] {
    const statusFilter = this.statusFilter();
    const categoryFilter = this.categoryFilter();
    const sortMode = this.sortMode();
    const query = this.searchTerm().toLowerCase().trim();

    const filtered = this.tasks().filter((task) => {
      if (statusFilter !== 'all' && task.status !== statusFilter) return false;
      if (categoryFilter !== 'all' && task.category !== categoryFilter) return false;
      if (query && !`${task.title} ${task.owner.email}`.toLowerCase().includes(query)) return false;
      return true;
    });

    const sorted = (list: Task[]) => {
      const clone = [...list];
      switch (sortMode) {
        case 'createdDesc':
          return clone.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        case 'createdAsc':
          return clone.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        case 'titleAsc':
          return clone.sort((a, b) => a.title.localeCompare(b.title));
        case 'titleDesc':
          return clone.sort((a, b) => b.title.localeCompare(a.title));
        default:
          return clone.sort((a, b) => a.position - b.position);
      }
    };

    const columns = STATUS_META.map((meta) => ({
      ...meta,
      tasks: sorted(filtered.filter((task) => task.status === meta.status)),
    }));

    if (statusFilter !== 'all') {
      return columns.filter((column) => column.status === statusFilter);
    }

    return columns;
  }

  private readThemePreference(): Theme {
    if (typeof window === 'undefined') {
      return 'light';
    }
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === 'dark' || stored === 'light') {
      return stored;
    }
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'light';
  }

  private persistTheme(theme: Theme) {
    if (typeof window === 'undefined') {
      return;
    }
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch (error) {
      console.warn('Unable to persist theme preference', error);
    }
  }
}

type SortMode = 'position' | 'createdDesc' | 'createdAsc' | 'titleAsc' | 'titleDesc';

type Theme = 'light' | 'dark';

const STATUS_META: Array<{ status: Task['status']; title: string; accent: string; value: Task['status'] }> = [
  { status: 'todo', title: 'Backlog', accent: 'linear-gradient(135deg, #f472b6, #fb7185)', value: 'todo' },
  { status: 'in-progress', title: 'In progress', accent: 'linear-gradient(135deg, #38bdf8, #3b82f6)', value: 'in-progress' },
  { status: 'done', title: 'Completed', accent: 'linear-gradient(135deg, #34d399, #10b981)', value: 'done' },
];

interface BoardColumn {
  status: Task['status'];
  title: string;
  accent: string;
  tasks: Task[];
}

interface ShortcutHint {
  keys: string[];
  description: string;
}

const HOTKEYS: ShortcutHint[] = [
  { keys: ['Shift', 'N'], description: 'Focus the new task form' },
  { keys: ['Shift', 'R'], description: 'Refresh tasks from the API' },
  { keys: ['Shift', 'T'], description: 'Toggle dark/light mode' },
  { keys: ['Esc'], description: 'Close the edit drawer' },
];

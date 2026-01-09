import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { Task, UpsertTaskPayload } from './tasks.models';

const API_BASE = '/api/tasks';

@Injectable({ providedIn: 'root' })
export class TasksService {
  constructor(private readonly http: HttpClient) {}

  list(): Promise<Task[]> {
    return firstValueFrom(this.http.get<Task[]>(API_BASE));
  }

  create(payload: UpsertTaskPayload): Promise<Task> {
    return firstValueFrom(this.http.post<Task>(API_BASE, payload));
  }

  update(id: number, payload: UpsertTaskPayload): Promise<Task> {
    return firstValueFrom(this.http.put<Task>(`${API_BASE}/${id}`, payload));
  }

  delete(id: number): Promise<{ success: boolean }> {
    return firstValueFrom(this.http.delete<{ success: boolean }>(`${API_BASE}/${id}`));
  }

  reorder(status: Task['status'], taskIds: number[]): Promise<{ success: boolean }> {
    return firstValueFrom(
      this.http.post<{ success: boolean }>(`${API_BASE}/reorder`, {
        status,
        taskIds,
      })
    );
  }
}

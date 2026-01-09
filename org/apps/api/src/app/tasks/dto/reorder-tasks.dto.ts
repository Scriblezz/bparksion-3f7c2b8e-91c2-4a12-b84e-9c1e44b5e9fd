import { TaskStatus } from '@org/data';

export interface ReorderTasksDto {
  status: TaskStatus;
  taskIds: number[];
}

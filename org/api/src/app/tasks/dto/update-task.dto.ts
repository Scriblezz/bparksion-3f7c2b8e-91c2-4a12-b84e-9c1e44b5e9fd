import { TaskStatus } from '@org/data';

export interface UpdateTaskDto {
  title?: string;
  description?: string;
  status?: TaskStatus;
  ownerId?: number;
}

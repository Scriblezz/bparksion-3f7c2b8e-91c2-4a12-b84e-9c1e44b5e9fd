import { TaskStatus } from '@org/data';

export interface CreateTaskDto {
  title: string;
  description?: string;
  status?: TaskStatus;
  ownerId?: number;
}

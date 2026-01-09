export interface Task {
  id: number;
  title: string;
  description?: string;
  status: 'todo' | 'in-progress' | 'done';
  category: string;
  position: number;
  owner: {
    id: number;
    email: string;
    role: 'owner' | 'admin' | 'viewer';
  };
  createdAt: string;
  updatedAt: string;
}

export interface UpsertTaskPayload {
  title?: string;
  description?: string;
  status?: 'todo' | 'in-progress' | 'done';
  category?: string;
}

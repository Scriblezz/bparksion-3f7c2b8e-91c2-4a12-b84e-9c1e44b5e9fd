export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthUser {
  id: number;
  email: string;
  role: 'owner' | 'admin' | 'viewer';
  orgId?: number;
}


import { HttpClient } from '@angular/common/http';
import { Injectable, computed, effect, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AuthUser, LoginRequest } from './auth.models';
import { TokenStorageService } from './token-storage.service';

const API_BASE = '/api';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly userSignal = signal<AuthUser | null>(null);
  readonly user = computed(() => this.userSignal());
  readonly isAuthenticated = computed(() => !!this.userSignal());

  constructor(
    private readonly http: HttpClient,
    private readonly tokenStorage: TokenStorageService
  ) {
    const existingToken = this.tokenStorage.token;
    if (existingToken) {
      this.fetchProfile().catch(() => this.logout());
    }

    effect(() => {
      if (!this.userSignal()) {
        return;
      }
      // future hook for analytics/auditing in UI
    });
  }

  async login(payload: LoginRequest): Promise<void> {
    const response = await firstValueFrom(
      this.http.post<{ access_token: string }>(`${API_BASE}/auth/login`, payload)
    );
    this.tokenStorage.token = response.access_token;
    await this.fetchProfile();
  }

  async fetchProfile(): Promise<void> {
    const profile = await firstValueFrom(
      this.http.get<AuthUser>(`${API_BASE}/auth/me`)
    );
    this.userSignal.set(profile);
  }

  logout(): void {
    this.tokenStorage.clear();
    this.userSignal.set(null);
  }

  get token(): string | null {
    return this.tokenStorage.token;
  }
}

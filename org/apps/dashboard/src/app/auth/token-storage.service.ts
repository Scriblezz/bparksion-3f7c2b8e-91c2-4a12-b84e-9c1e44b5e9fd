import { Injectable } from '@angular/core';

const TOKEN_KEY = 'org-dashboard-token';

@Injectable({ providedIn: 'root' })
export class TokenStorageService {
  get token(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  set token(value: string | null) {
    if (!value) {
      localStorage.removeItem(TOKEN_KEY);
      return;
    }
    localStorage.setItem(TOKEN_KEY, value);
  }

  clear(): void {
    localStorage.removeItem(TOKEN_KEY);
  }
}

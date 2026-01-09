import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <section class="auth-card">
      <h1>Sign in</h1>
      <form [formGroup]="form" (ngSubmit)="submit()">
        <label>
          Email
          <input formControlName="email" type="email" placeholder="you@example.com" />
        </label>

        <label>
          Password
          <input formControlName="password" type="password" placeholder="••••••••" />
        </label>

        <button type="submit" [disabled]="form.invalid || loading()">
          {{ loading() ? 'Signing in…' : 'Sign in' }}
        </button>

        <p class="hint">
          Use one of the seeded accounts, e.g. <strong>owner@example.com / Passw0rd!</strong>
        </p>

        <p class="error" *ngIf="error()">{{ error() }}</p>
      </form>
    </section>
  `,
  styles: [
    `
      .auth-card {
        max-width: 420px;
        margin: 4rem auto;
        padding: 2rem;
        border-radius: 16px;
        background: rgba(255, 255, 255, 0.9);
        box-shadow: 0 25px 45px rgba(15, 23, 42, 0.15);
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }

      form {
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }

      label {
        font-size: 0.85rem;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: #475569;
        display: flex;
        flex-direction: column;
        gap: 0.35rem;
      }

      input {
        border: 1px solid #cbd5f5;
        border-radius: 8px;
        padding: 0.65rem 0.75rem;
        font-size: 1rem;
      }

      button {
        border: none;
        border-radius: 999px;
        padding: 0.95rem;
        font-weight: 600;
        background: linear-gradient(120deg, #4338ca, #4f46e5);
        color: white;
        cursor: pointer;
        transition: opacity 0.15s ease;
      }

      button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      .hint {
        font-size: 0.85rem;
        color: #64748b;
        margin: 0;
      }

      .error {
        color: #dc2626;
        font-size: 0.9rem;
        margin: 0;
      }
    `,
  ],
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

  async submit(): Promise<void> {
    if (this.form.invalid) return;

    this.loading.set(true);
    this.error.set(null);

    try {
      await this.auth.login(this.form.getRawValue());
      await this.router.navigateByUrl('/');
    } catch (error) {
      this.error.set('Login failed. Check your credentials.');
    } finally {
      this.loading.set(false);
    }
  }
}

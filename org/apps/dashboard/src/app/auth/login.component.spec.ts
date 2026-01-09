import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';
import { LoginComponent } from './login.component';

describe('LoginComponent', () => {
  let fixture: ComponentFixture<LoginComponent>;
  let authService: { login: jest.Mock; fetchProfile?: jest.Mock };
  let router: { navigateByUrl: jest.Mock };

  beforeEach(async () => {
    authService = {
      login: jest.fn().mockResolvedValue(undefined),
    };
    router = {
      navigateByUrl: jest.fn().mockResolvedValue(true),
    };

    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: Router, useValue: router },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    fixture.detectChanges();
  });

  it('disables the submit button until the form is valid', async () => {
    const button: HTMLButtonElement = fixture.nativeElement.querySelector('button');
    expect(button.disabled).toBe(true);

    fixture.componentInstance.form.setValue({
      email: 'owner@example.com',
      password: 'Passw0rd!',
    });

    fixture.detectChanges();
    expect(button.disabled).toBe(false);
  });

  it('logs in and navigates on submit', async () => {
    const component = fixture.componentInstance;
    component.form.setValue({ email: 'owner@example.com', password: 'Passw0rd!' });

    await component.submit();

    expect(authService.login).toHaveBeenCalledWith({
      email: 'owner@example.com',
      password: 'Passw0rd!',
    });
    expect(router.navigateByUrl).toHaveBeenCalledWith('/');
  });

  it('shows an error message when login fails', async () => {
    authService.login.mockRejectedValueOnce(new Error('Invalid credentials'));
    const component = fixture.componentInstance;
    component.form.setValue({ email: 'owner@example.com', password: 'wrong' });

    await component.submit();
    fixture.detectChanges();

    const errorEl: HTMLParagraphElement | null = fixture.nativeElement.querySelector('.error');
    expect(errorEl?.textContent).toContain('Login failed');
  });
});

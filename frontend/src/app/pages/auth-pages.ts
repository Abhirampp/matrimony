import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { errorMessage } from '../core/api.service';
import { Gender } from '../core/models';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <div class="auth-wrap">
      <form class="card auth-card" [formGroup]="form" (ngSubmit)="submit()">
        <h2>Welcome back</h2>
        <p class="muted">Login to see your matches.</p>
        @if (error()) { <div class="alert alert-error">{{ error() }}</div> }
        <label>Email
          <input type="email" formControlName="email" autocomplete="email" />
        </label>
        <label>Password
          <input type="password" formControlName="password" autocomplete="current-password" />
        </label>
        <p class="small forgot"><a routerLink="/forgot-password">Forgot password?</a></p>
        <button class="btn btn-primary btn-block" [disabled]="form.invalid || busy()">
          {{ busy() ? 'Logging in…' : 'Login' }}
        </button>
        <p class="muted center">New here? <a routerLink="/register">Create an account</a></p>
      </form>
    </div>
  `,
})
export class LoginPage {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);
  busy = signal(false);
  error = signal('');

  form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  submit() {
    if (this.form.invalid) return;
    this.busy.set(true);
    this.error.set('');
    const { email, password } = this.form.getRawValue();
    this.auth.login(email, password).subscribe({
      next: (r) => this.router.navigate([r.role === 'Admin' ? '/admin' : r.profileComplete ? '/dashboard' : '/my-profile']),
      error: (e) => { this.error.set(errorMessage(e)); this.busy.set(false); },
    });
  }
}

@Component({
  selector: 'app-register',
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <div class="auth-wrap">
      <form class="card auth-card" [formGroup]="form" (ngSubmit)="submit()">
        <h2>Create your profile</h2>
        <p class="muted">It's free and takes a minute.</p>
        @if (error()) { <div class="alert alert-error">{{ error() }}</div> }
        <label>Creating this profile for
          <select formControlName="createdBy">
            <option value="Self">Myself</option>
            <option value="Parent">My son / daughter</option>
            <option value="Sibling">My brother / sister</option>
            <option value="Relative">A relative</option>
            <option value="Friend">A friend</option>
          </select>
        </label>
        <label>Full name {{ form.controls.createdBy.value === 'Self' ? '' : '(of the bride / groom)' }}
          <input formControlName="fullName" autocomplete="name" />
        </label>
        <div class="grid-2">
          <label>Gender
            <select formControlName="gender">
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </select>
          </label>
          <label>Date of birth
            <input type="date" formControlName="dateOfBirth" [max]="maxDob" />
          </label>
        </div>
        <label>Email
          <input type="email" formControlName="email" autocomplete="email" />
        </label>
        <label>Mobile (optional)
          <input type="tel" formControlName="phone" autocomplete="tel" />
        </label>
        <label>Password <span class="muted">(min 6 characters)</span>
          <input type="password" formControlName="password" autocomplete="new-password" />
        </label>
        <button class="btn btn-primary btn-block" [disabled]="form.invalid || busy()">
          {{ busy() ? 'Creating…' : 'Register' }}
        </button>
        <p class="muted center">Already registered? <a routerLink="/login">Login</a></p>
      </form>
    </div>
  `,
})
export class RegisterPage {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);
  busy = signal(false);
  error = signal('');
  maxDob = new Date(new Date().setFullYear(new Date().getFullYear() - 18)).toISOString().slice(0, 10);

  form = this.fb.nonNullable.group({
    createdBy: ['Self'],
    fullName: ['', [Validators.required, Validators.maxLength(100)]],
    gender: ['Female' as Gender, Validators.required],
    dateOfBirth: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    phone: [''],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  submit() {
    if (this.form.invalid) return;
    this.busy.set(true);
    this.error.set('');
    const v = this.form.getRawValue();
    this.auth.register({ ...v, phone: v.phone || undefined }).subscribe({
      // A confirmation email is sent automatically on registration
      next: () => this.router.navigate(['/my-profile'], { queryParams: { welcome: 1 } }),
      error: (e) => { this.error.set(errorMessage(e)); this.busy.set(false); },
    });
  }
}

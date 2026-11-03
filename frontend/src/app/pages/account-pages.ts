import { Component, OnInit, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService, errorMessage } from '../core/api.service';
import { AuthService } from '../core/auth.service';

@Component({
  selector: 'app-forgot-password',
  imports: [FormsModule, RouterLink],
  template: `
    <div class="auth-wrap">
      <form class="card auth-card" (ngSubmit)="submit()">
        <h2>Forgot your password?</h2>
        @if (sent()) {
          <div class="alert alert-success">If an account exists for <b>{{ email }}</b>, we've emailed a link to reset the password.
            It works for 30 minutes.</div>
          <p class="muted small">Didn't get it? Check your spam folder, or try again in a minute.</p>
          <a routerLink="/login" class="btn btn-ghost btn-block">Back to login</a>
        } @else {
          <p class="muted">Enter the email you registered with and we'll send you a reset link.</p>
          @if (error()) { <div class="alert alert-error">{{ error() }}</div> }
          <label>Email <input type="email" [(ngModel)]="email" name="email" required autocomplete="email" /></label>
          <button class="btn btn-primary btn-block" [disabled]="!email || busy()">{{ busy() ? 'Sending…' : 'Send reset link' }}</button>
          <p class="muted center"><a routerLink="/login">Back to login</a></p>
        }
      </form>
    </div>
  `,
})
export class ForgotPasswordPage {
  private api = inject(ApiService);
  email = '';
  busy = signal(false);
  sent = signal(false);
  error = signal('');

  submit() {
    this.busy.set(true);
    this.error.set('');
    this.api.forgotPassword(this.email.trim()).subscribe({
      next: () => { this.sent.set(true); this.busy.set(false); },
      error: (e) => { this.error.set(errorMessage(e)); this.busy.set(false); },
    });
  }
}

@Component({
  selector: 'app-reset-password',
  imports: [FormsModule, RouterLink],
  template: `
    <div class="auth-wrap">
      <form class="card auth-card" (ngSubmit)="submit()">
        <h2>Choose a new password</h2>
        @if (done()) {
          <div class="alert alert-success">Your password has been changed. You can log in with it now.</div>
          <a routerLink="/login" class="btn btn-primary btn-block">Go to login</a>
        } @else if (!token()) {
          <div class="alert alert-error">This link is incomplete. Open the link from your email again.</div>
        } @else {
          @if (error()) { <div class="alert alert-error">{{ error() }}</div> }
          <label>New password <span class="muted">(min 6 characters)</span>
            <input type="password" [(ngModel)]="password" name="password" minlength="6" required autocomplete="new-password" />
          </label>
          <label>Confirm new password
            <input type="password" [(ngModel)]="confirm" name="confirm" required autocomplete="new-password" />
          </label>
          @if (confirm && password !== confirm) { <p class="alert alert-error small">The passwords don't match.</p> }
          <button class="btn btn-primary btn-block" [disabled]="password.length < 6 || password !== confirm || busy()">
            {{ busy() ? 'Saving…' : 'Save new password' }}
          </button>
          <p class="muted center small">Link expired? <a routerLink="/forgot-password">Get a new one</a></p>
        }
      </form>
    </div>
  `,
})
export class ResetPasswordPage {
  private api = inject(ApiService);
  token = input<string>();
  password = '';
  confirm = '';
  busy = signal(false);
  done = signal(false);
  error = signal('');

  submit() {
    this.busy.set(true);
    this.error.set('');
    this.api.resetPassword(this.token()!, this.password).subscribe({
      next: () => { this.done.set(true); this.busy.set(false); },
      error: (e) => { this.error.set(errorMessage(e)); this.busy.set(false); },
    });
  }
}

@Component({
  selector: 'app-verify-email',
  imports: [RouterLink],
  template: `
    <div class="auth-wrap">
      <div class="card auth-card center-text">
        @switch (state()) {
          @case ('working') { <h2>Confirming your email…</h2> }
          @case ('ok') {
            <h2>✔ Email confirmed</h2>
            <p class="muted">Thanks! Your email address is verified.</p>
            <a [routerLink]="auth.isLoggedIn() ? '/dashboard' : '/login'" class="btn btn-primary">Continue</a>
          }
          @default {
            <h2>Link not valid</h2>
            <div class="alert alert-error">{{ error() }}</div>
            <a [routerLink]="auth.isLoggedIn() ? '/my-profile' : '/login'" class="btn btn-ghost">
              {{ auth.isLoggedIn() ? 'Send a new link from My Profile' : 'Log in to send a new link' }}</a>
          }
        }
      </div>
    </div>
  `,
})
export class VerifyEmailPage implements OnInit {
  auth = inject(AuthService);
  private api = inject(ApiService);
  token = input<string>();
  state = signal<'working' | 'ok' | 'failed'>('working');
  error = signal('');

  ngOnInit() {
    const t = this.token();
    if (!t) { this.state.set('failed'); this.error.set('This link is incomplete.'); return; }
    this.api.verifyEmail(t).subscribe({
      next: () => this.state.set('ok'),
      error: (e) => { this.state.set('failed'); this.error.set(errorMessage(e)); },
    });
  }
}

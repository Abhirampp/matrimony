import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from './core/auth.service';
import { RealtimeService } from './core/realtime.service';
import { ApiService } from './core/api.service';
import { AppNotification } from './core/models';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <header class="topbar">
      <div class="container topbar-inner">
        <a class="brand" [routerLink]="auth.isLoggedIn() ? (auth.isAdmin() ? '/admin' : '/dashboard') : '/'">
          <span class="brand-mark">♥</span> Vivaha
        </a>
        @if (auth.isLoggedIn() && !auth.isAdmin()) {
          <a class="bell" routerLink="/notifications" aria-label="Notifications" title="Notifications">
            🔔 @if (rt.badges().notifications) { <span class="nav-badge">{{ cap(rt.badges().notifications) }}</span> }
          </a>
        }
        <button class="menu-btn" (click)="menuOpen.set(!menuOpen())" aria-label="Menu">☰</button>
        <nav [class.open]="menuOpen()" (click)="menuOpen.set(false)">
          @if (auth.isLoggedIn()) {
            @if (auth.isAdmin()) {
              <a routerLink="/admin" routerLinkActive="active">Admin</a>
            } @else {
              <a routerLink="/dashboard" routerLinkActive="active">Home</a>
              <a routerLink="/search" routerLinkActive="active">Search</a>
              <a routerLink="/interests" routerLinkActive="active">Interests</a>
              <a routerLink="/shortlist" routerLinkActive="active">Shortlist</a>
              <a routerLink="/messages" routerLinkActive="active">
                Messages @if (rt.badges().messages) { <span class="nav-badge inline">{{ cap(rt.badges().messages) }}</span> }
              </a>
              <a routerLink="/my-profile" routerLinkActive="active">My Profile</a>
              <a routerLink="/plans" routerLinkActive="active" class="upgrade-link">★ Plans</a>
            }
            <button class="btn btn-ghost btn-sm" (click)="auth.logout()">Logout</button>
          } @else {
            <a routerLink="/login" routerLinkActive="active">Login</a>
            <a routerLink="/register" class="btn btn-primary btn-sm">Register Free</a>
          }
        </nav>
      </div>
    </header>
    <main>
      <router-outlet />
    </main>

    @if (rt.toast(); as t) {
      <div class="toast" role="status">
        <button class="toast-body" (click)="openToast(t)">🔔 {{ t.text }}</button>
        <button class="toast-close" (click)="rt.dismissToast()" aria-label="Dismiss">×</button>
      </div>
    }

    <footer class="footer">
      <div class="container footer-inner">
        <span>© {{ year }} Vivaha Matrimony · Built with Angular, .NET &amp; SQL Server</span>
        <span class="footer-links"><a routerLink="/success-stories">Success stories</a> · <a routerLink="/plans">Plans</a></span>
      </div>
    </footer>
  `,
})
export class App {
  auth = inject(AuthService);
  rt = inject(RealtimeService);
  private api = inject(ApiService);
  private router = inject(Router);
  menuOpen = signal(false);
  year = new Date().getFullYear();

  cap = (n: number) => (n > 99 ? '99+' : n);

  openToast(n: AppNotification) {
    this.rt.dismissToast();
    this.api.readNotification(n.id).subscribe();
    if (n.link) this.router.navigateByUrl(n.link);
  }
}

import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthResponse, Gender } from './models';

const STORAGE_KEY = 'matrimony.auth';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private base = `${environment.apiUrl}/api/auth`;

  readonly user = signal<AuthResponse | null>(this.load());
  readonly isLoggedIn = computed(() => !!this.user());
  readonly isAdmin = computed(() => this.user()?.role === 'Admin');

  get token(): string | null {
    return this.user()?.token ?? null;
  }

  login(email: string, password: string) {
    return this.http.post<AuthResponse>(`${this.base}/login`, { email, password }).pipe(tap((r) => this.save(r)));
  }

  register(data: { email: string; password: string; fullName: string; gender: Gender; dateOfBirth: string; phone?: string; createdBy?: string }) {
    return this.http.post<AuthResponse>(`${this.base}/register`, data).pipe(tap((r) => this.save(r)));
  }

  changePassword(currentPassword: string, newPassword: string) {
    return this.http.post<void>(`${this.base}/change-password`, { currentPassword, newPassword });
  }

  updateName(fullName: string) {
    const u = this.user();
    if (u) this.save({ ...u, fullName, profileComplete: true });
  }

  logout() {
    localStorage.removeItem(STORAGE_KEY);
    this.user.set(null);
    this.router.navigate(['/login']);
  }

  private save(r: AuthResponse) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(r));
    } catch {}
    this.user.set(r);
  }

  private load(): AuthResponse | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as AuthResponse) : null;
    } catch {
      return null;
    }
  }
}

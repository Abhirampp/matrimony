import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { Account, Dashboard, MyPlan, ProfileCard } from '../core/models';
import { ProfileCardComponent } from '../shared/profile-card';

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink, ProfileCardComponent],
  template: `
    <div class="container page">
      <div class="section-head">
        <h1>Hello, {{ firstName() }} 👋</h1>
        @if (plan(); as m) {
          @if (m.isPaid) {
            <a routerLink="/plans" class="plan-chip" [class]="'plan-chip plan-' + m.plan.code.toLowerCase()">★ {{ m.plan.name }} · {{ m.contactViewsLeft }} contact views left</a>
          } @else {
            <a routerLink="/plans" class="btn btn-primary btn-sm">★ Upgrade</a>
          }
        }
      </div>

      @if (account(); as a) {
        @if (!a.emailVerified || !a.phoneVerified) {
          <div class="alert alert-info">
            🔐 {{ !a.emailVerified && !a.phoneVerified ? 'Confirm your email and mobile number' : !a.emailVerified ? 'Confirm your email address' : 'Verify your mobile number' }}
            to keep your account safe and build trust.
            <a routerLink="/my-profile" fragment="account">Do it now →</a>
          </div>
        }
      }

      @if (stats(); as s) {
        @if (s.isHidden) {
          <div class="alert alert-info">🙈 Your profile is hidden from search and matches.
            <a routerLink="/my-profile" fragment="privacy">Change this</a></div>
        }
        @if (s.completeness.percent < 100) {
          <a class="card completeness link-card" routerLink="/my-profile">
            <div class="row gap">
              <b>Your profile is {{ s.completeness.percent }}% complete</b>
              <span class="meter grow"><span [style.width.%]="s.completeness.percent"></span></span>
            </div>
            <p class="muted small">Add {{ s.completeness.missing.slice(0, 3).join(', ') }}{{ s.completeness.missing.length > 3 ? '…' : '' }} to get better matches →</p>
          </a>
        }
        <div class="stats">
          <a class="stat" routerLink="/interests"><b>{{ s.pendingInterests }}</b><span>Pending interests</span></a>
          <a class="stat" routerLink="/interests"><b>{{ s.accepted }}</b><span>Connections</span></a>
          <a class="stat" routerLink="/messages"><b>{{ s.unreadMessages }}</b><span>Unread messages</span></a>
          <a class="stat" routerLink="/interests" [queryParams]="{ tab: 'photos' }"><b>{{ s.pendingPhotoRequests }}</b><span>Photo requests</span></a>
          <a class="stat" routerLink="/shortlist"><b>{{ s.shortlisted }}</b><span>Shortlisted</span></a>
          <div class="stat"><b>{{ s.profileViews }}</b><span>Profile views</span></div>
        </div>
      }

      <div class="section-head">
        <h2>Your matches</h2>
        <a routerLink="/my-profile" class="muted">Edit partner preferences →</a>
      </div>
      @if (loading()) {
        <p class="muted">Loading matches…</p>
      } @else if (matches().length === 0) {
        <div class="empty">No new matches for your preferences. Try <a routerLink="/search">searching</a> or widening your preferences.</div>
      } @else {
        <div class="cards">
          @for (p of matches(); track p.userId) { <app-profile-card [profile]="p" /> }
        </div>
        @if (total() > matches().length) {
          <div class="center"><button class="btn btn-outline" (click)="more()">Show more</button></div>
        }
      }

      @if (recent().length) {
        <h2>Recently joined</h2>
        <div class="cards">
          @for (p of recent(); track p.userId) { <app-profile-card [profile]="p" /> }
        </div>
      }

      @if (shortlistedMe().length) {
        <div class="section-head">
          <h2>Shortlisted you</h2>
          <a routerLink="/shortlist" [queryParams]="{ tab: 'me' }" class="muted">See all →</a>
        </div>
        <div class="cards">
          @for (p of shortlistedMe(); track p.userId) { <app-profile-card [profile]="p" /> }
        </div>
      }

      @if (visitorsLocked() && visitorCount() > 0) {
        <a class="card link-card locked-visitors" routerLink="/plans">
          <b>👀 {{ visitorCount() }} {{ visitorCount() === 1 ? 'person' : 'people' }} viewed your profile</b>
          <p class="muted small">Upgrade to Gold or Platinum to see who →</p>
        </a>
      }

      @if (visitors().length) {
        <h2>Recently viewed your profile</h2>
        <div class="cards">
          @for (p of visitors(); track p.userId) { <app-profile-card [profile]="p" /> }
        </div>
      }
    </div>
  `,
})
export class DashboardPage {
  private api = inject(ApiService);
  private auth = inject(AuthService);

  stats = signal<Dashboard | null>(null);
  matches = signal<ProfileCard[]>([]);
  visitors = signal<ProfileCard[]>([]);
  visitorsLocked = signal(false);
  visitorCount = signal(0);
  account = signal<Account | null>(null);
  plan = signal<MyPlan | null>(null);
  recent = signal<ProfileCard[]>([]);
  shortlistedMe = signal<ProfileCard[]>([]);
  total = signal(0);
  loading = signal(true);
  private page = 1;

  firstName = () => this.auth.user()?.fullName.split(' ')[0] ?? '';

  constructor() {
    this.api.dashboard().subscribe((s) => this.stats.set(s));
    this.api.visitors().subscribe((v) => {
      this.visitors.set(v.items.slice(0, 6));
      this.visitorsLocked.set(v.locked);
      this.visitorCount.set(v.count);
    });
    this.api.account().subscribe((a) => this.account.set(a));
    this.api.myPlan().subscribe((m) => this.plan.set(m));
    this.api.recent(6).subscribe((r) => this.recent.set(r));
    this.api.shortlistedMe().subscribe((r) => this.shortlistedMe.set(r.slice(0, 6)));
    this.load();
  }

  more() {
    this.page++;
    this.load();
  }

  private load() {
    this.api.matches(this.page).subscribe({
      next: (r) => {
        this.matches.update((m) => [...m, ...r.items]);
        this.total.set(r.total);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}

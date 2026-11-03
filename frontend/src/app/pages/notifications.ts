import { Component, DestroyRef, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { ApiService } from '../core/api.service';
import { RealtimeService } from '../core/realtime.service';
import { AppNotification, NotificationType } from '../core/models';

const ICONS: Record<NotificationType, string> = {
  InterestReceived: '💌',
  InterestAccepted: '🎉',
  PhotoRequested: '📷',
  PhotoRequestApproved: '🖼️',
  VerificationApproved: '✔️',
  VerificationRejected: '⚠️',
  Shortlisted: '⭐',
  PlanActivated: '👑',
  PlanExpiring: '⏳',
  PlanExpired: '⌛',
  StoryApproved: '💐',
};

@Component({
  selector: 'app-notifications',
  imports: [DatePipe],
  template: `
    <div class="container page narrow">
      <div class="section-head">
        <h1>Notifications</h1>
        @if (unread() > 0) { <button class="btn btn-ghost btn-sm" (click)="readAll()">Mark all as read</button> }
      </div>
      @if (loaded() && items().length === 0) {
        <div class="empty">No notifications yet. You'll hear here when someone sends you an interest, accepts yours or asks to see your photos.</div>
      }
      <div class="list">
        @for (n of items(); track n.id) {
          <button class="card notif" [class.unread]="!n.isRead" (click)="open(n)">
            <span class="notif-icon">{{ icon(n.type) }}</span>
            <span class="notif-main">
              <span>{{ n.text }}</span>
              <span class="muted small">{{ n.createdAt | date: 'd MMM y, h:mm a' }}</span>
            </span>
            @if (!n.isRead) { <span class="dot" aria-label="Unread"></span> }
          </button>
        }
      </div>
    </div>
  `,
})
export class NotificationsPage {
  private api = inject(ApiService);
  private rt = inject(RealtimeService);
  private router = inject(Router);
  items = signal<AppNotification[]>([]);
  loaded = signal(false);

  unread = () => this.items().filter((n) => !n.isRead).length;
  icon = (t: NotificationType) => ICONS[t] ?? '🔔';

  constructor() {
    this.load();
    // New notifications appear at the top as they arrive
    this.rt.notifications$.pipe(takeUntilDestroyed(inject(DestroyRef))).subscribe((n) => this.items.update((l) => [n, ...l]));
    this.rt.reconnected$.pipe(takeUntilDestroyed(inject(DestroyRef))).subscribe(() => this.load());
  }

  private load() {
    this.api.notifications().subscribe((r) => { this.items.set(r); this.loaded.set(true); });
  }

  open(n: AppNotification) {
    if (!n.isRead) {
      this.api.readNotification(n.id).subscribe();
      this.items.update((l) => l.map((x) => (x.id === n.id ? { ...x, isRead: true } : x)));
    }
    if (n.link) this.router.navigateByUrl(n.link);
  }

  readAll() {
    this.api.readAllNotifications().subscribe(() => this.items.update((l) => l.map((x) => ({ ...x, isRead: true }))));
  }
}

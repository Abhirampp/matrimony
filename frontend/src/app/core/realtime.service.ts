import { Injectable, effect, inject, signal } from '@angular/core';
import { HubConnection, HubConnectionBuilder, HubConnectionState, LogLevel } from '@microsoft/signalr';
import { Subject } from 'rxjs';
import { environment } from '../../environments/environment';
import { ApiService } from './api.service';
import { AuthService } from './auth.service';
import { AppNotification, Badges, Message } from './models';

/**
 * Live connection to the API (SignalR). Connects while a member is logged in and
 * exposes unread badge counts, incoming messages and new notifications.
 */
@Injectable({ providedIn: 'root' })
export class RealtimeService {
  private auth = inject(AuthService);
  private api = inject(ApiService);
  private connection: HubConnection | null = null;

  readonly badges = signal<Badges>({ notifications: 0, messages: 0 });
  readonly connected = signal(false);
  /** The latest notification, for the on-screen toast. */
  readonly toast = signal<AppNotification | null>(null);

  readonly messages$ = new Subject<Message>();
  /** Emits the id of a member who just read your messages. */
  readonly read$ = new Subject<number>();
  readonly notifications$ = new Subject<AppNotification>();
  /** Fires after a dropped connection comes back, so pages can catch up on anything missed. */
  readonly reconnected$ = new Subject<void>();

  private toastTimer: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    // Connect on login, disconnect on logout
    effect(() => {
      const user = this.auth.user();
      if (user && user.role === 'User') this.start();
      else this.stop();
    });
  }

  refreshBadges() {
    if (this.auth.isLoggedIn()) this.api.badges().subscribe((b) => this.badges.set(b));
  }

  private async start() {
    await this.stop();
    const connection = new HubConnectionBuilder()
      .withUrl(`${environment.apiUrl}/hubs/app`, { accessTokenFactory: () => this.auth.token ?? '' })
      .withAutomaticReconnect()
      .configureLogging(LogLevel.Warning)
      .build();

    connection.on('message', (m: Message) => this.messages$.next(m));
    connection.on('read', (e: { by: number }) => this.read$.next(e.by));
    connection.on('badges', (b: Badges) => this.badges.set(b));
    connection.on('notification', (n: AppNotification) => {
      this.notifications$.next(n);
      this.showToast(n);
    });
    connection.onreconnected(() => {
      this.connected.set(true);
      this.refreshBadges();
      this.reconnected$.next();
    });
    connection.onreconnecting(() => this.connected.set(false));
    connection.onclose(() => this.connected.set(false));

    this.connection = connection;
    this.refreshBadges();
    try {
      await connection.start();
      this.connected.set(true);
    } catch (err) {
      console.warn('Live updates unavailable', err);
    }
  }

  private async stop() {
    const c = this.connection;
    this.connection = null;
    this.connected.set(false);
    if (c && c.state !== HubConnectionState.Disconnected) await c.stop();
  }

  private showToast(n: AppNotification) {
    this.toast.set(n);
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => this.toast.set(null), 6000);
  }

  dismissToast() {
    this.toast.set(null);
  }
}

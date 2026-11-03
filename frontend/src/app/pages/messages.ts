import { Component, ElementRef, OnChanges, inject, input, signal, viewChild } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { ApiService, errorMessage } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { RealtimeService } from '../core/realtime.service';
import { Conversation, Message } from '../core/models';
import { initials } from '../shared/options';

/** Conversation list + chat thread. New messages arrive instantly over SignalR. */
@Component({
  selector: 'app-messages',
  imports: [RouterLink, DatePipe, FormsModule],
  template: `
    <div class="container page chat-layout" [class.has-thread]="!!id()">
      <aside class="card convo-list">
        <h3>Conversations</h3>
        @if (convos().length === 0) {
          <p class="muted">No connections yet. Once someone accepts your interest (or you accept theirs) you can chat here.</p>
        }
        @for (c of convos(); track c.with.userId) {
          <a class="convo" [routerLink]="['/messages', c.with.userId]" [class.active]="otherId() === c.with.userId">
            <span class="list-avatar sm">
              @if (api.photo(c.with.photoUrl); as src) { <img [src]="src" [alt]="c.with.fullName" /> }
              @else { <span class="avatar-initials">{{ initialsOf(c.with.fullName) }}</span> }
            </span>
            <span class="convo-main">
              <b>{{ c.with.fullName }}</b>
              <span class="muted small ellipsis">{{ c.lastMessage || 'Say hello 👋' }}</span>
            </span>
            @if (c.unread) { <span class="unread">{{ c.unread }}</span> }
          </a>
        }
      </aside>

      <section class="card thread">
        @if (id()) {
          @let other = current();
          <div class="thread-head">
            <a routerLink="/messages" class="back">‹</a>
            @if (other) { <a [routerLink]="['/profile', other.with.userId]"><b>{{ other.with.fullName }}</b></a> }
            <span class="grow"></span>
            <span class="live" [class.on]="rt.connected()" [title]="rt.connected() ? 'Live' : 'Reconnecting…'">
              {{ rt.connected() ? '● Live' : '○ Reconnecting…' }}
            </span>
          </div>
          <div class="thread-body" #body>
            @if (error()) { <div class="alert alert-error">{{ error() }}</div> }
            @for (m of messages(); track m.id) {
              <div class="bubble" [class.mine]="m.senderId === myId()">
                <div>{{ m.content }}</div>
                <div class="time">{{ m.sentAt | date: 'd MMM, h:mm a' }}
                  @if (m.senderId === myId()) { <span class="ticks">{{ m.isRead ? '✓✓' : '✓' }}</span> }
                </div>
              </div>
            }
            @if (!error() && messages().length === 0) { <p class="muted center">No messages yet. Start the conversation!</p> }
          </div>
          <form class="thread-input" (ngSubmit)="send()">
            <input [(ngModel)]="draft" name="draft" placeholder="Type a message…" maxlength="2000" autocomplete="off" />
            <button class="btn btn-primary" [disabled]="!draft.trim() || sending()">Send</button>
          </form>
        } @else {
          <div class="empty">Select a conversation</div>
        }
      </section>
    </div>
  `,
})
export class MessagesPage implements OnChanges {
  api = inject(ApiService);
  rt = inject(RealtimeService);
  private auth = inject(AuthService);
  private body = viewChild<ElementRef<HTMLDivElement>>('body');

  id = input<string>();
  convos = signal<Conversation[]>([]);
  messages = signal<Message[]>([]);
  error = signal('');
  sending = signal(false);
  draft = '';
  initialsOf = initials;

  myId = () => this.auth.user()?.userId;
  otherId = () => +(this.id() ?? 0);
  current = () => this.convos().find((c) => c.with.userId === this.otherId());

  constructor() {
    this.rt.messages$.pipe(takeUntilDestroyed()).subscribe((m) => this.onLive(m));
    this.rt.read$.pipe(takeUntilDestroyed()).subscribe((by) => {
      if (by === this.otherId()) this.messages.update((l) => l.map((m) => (m.senderId === this.myId() ? { ...m, isRead: true } : m)));
    });
    // After a dropped connection, reload in case something was missed
    this.rt.reconnected$.pipe(takeUntilDestroyed()).subscribe(() => this.load());
  }

  ngOnChanges() {
    this.messages.set([]);
    this.error.set('');
    this.load();
  }

  send() {
    const text = this.draft.trim();
    const to = this.otherId();
    if (!text || !to) return;
    this.draft = '';
    this.sending.set(true);
    this.api.sendMessage(to, text).subscribe({
      next: (m) => { this.add(m); this.sending.set(false); },
      error: (e) => { this.error.set(errorMessage(e)); this.draft = text; this.sending.set(false); },
    });
  }

  private onLive(m: Message) {
    const other = this.otherId();
    const inThread = other && (m.senderId === other || m.receiverId === other);
    if (inThread) {
      this.add(m);
      // Opening the thread marks their messages as read
      if (m.senderId === other) this.api.thread(other).subscribe((list) => this.messages.set(list));
    }
    this.loadConversations();
  }

  private add(m: Message) {
    if (this.messages().some((x) => x.id === m.id)) return;
    this.messages.update((l) => [...l, m]);
    this.scrollDown();
  }

  private load() {
    this.loadConversations();
    const to = this.otherId();
    if (!to) return;
    this.api.thread(to).subscribe({
      next: (m) => { this.messages.set(m); this.scrollDown(); this.rt.refreshBadges(); },
      error: (e) => this.error.set(e.status === 403 ? 'You can chat only after an interest is accepted.' : errorMessage(e)),
    });
  }

  private loadConversations() {
    this.api.conversations().subscribe((c) => this.convos.set(c));
  }

  private scrollDown() {
    setTimeout(() => {
      const el = this.body()?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    });
  }
}

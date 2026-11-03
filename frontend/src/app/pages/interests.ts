import { Component, OnInit, inject, input, signal } from '@angular/core';
import { DatePipe, NgTemplateOutlet } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService, errorMessage } from '../core/api.service';
import { Interest, PhotoRequest, ProfileCard } from '../core/models';
import { initials } from '../shared/options';

type Tab = 'received' | 'sent' | 'photos';

@Component({
  selector: 'app-interests',
  imports: [RouterLink, DatePipe, NgTemplateOutlet],
  template: `
    <ng-template #avatar let-p>
      <a [routerLink]="['/profile', p.userId]" class="list-avatar">
        @if (api.photo(p.photoUrl); as src) { <img [src]="src" [alt]="p.fullName" /> }
        @else if (p.photoLocked) { <span class="lock">🔒</span> }
        @else { <span class="avatar-initials">{{ initialsOf(p.fullName) }}</span> }
      </a>
    </ng-template>

    <div class="container page narrow">
      <h1>Interests</h1>
      <div class="tabs">
        <button [class.active]="tab() === 'received'" (click)="tab.set('received')">Received ({{ received().length }})</button>
        <button [class.active]="tab() === 'sent'" (click)="tab.set('sent')">Sent ({{ sent().length }})</button>
        <button [class.active]="tab() === 'photos'" (click)="tab.set('photos')">Photo requests ({{ pendingPhotos() }})</button>
      </div>
      @if (error()) { <div class="alert alert-error">{{ error() }}</div> }

      @if (tab() === 'photos') {
        @if (photoRequests().length === 0) {
          <div class="empty">No photo requests. People ask to see your photos when they're set to "Only connections and people I approve".</div>
        }
        <div class="list">
          @for (r of photoRequests(); track r.id) {
            <div class="card list-item">
              <ng-container *ngTemplateOutlet="avatar; context: { $implicit: r.profile }" />
              <div class="list-main">
                <a [routerLink]="['/profile', r.profile.userId]"><b>{{ r.profile.fullName }}</b></a> wants to see your photos
                <div class="muted">{{ summary(r.profile) }}</div>
                <div class="muted small">{{ r.createdAt | date: 'd MMM y, h:mm a' }}</div>
              </div>
              <div class="list-actions">
                @switch (r.status) {
                  @case ('Pending') {
                    <button class="btn btn-primary btn-sm" (click)="respondPhoto(r, true)">Allow</button>
                    <button class="btn btn-ghost btn-sm" (click)="respondPhoto(r, false)">Decline</button>
                  }
                  @case ('Approved') {
                    <span class="pill pill-success">Allowed</span>
                    <button class="btn btn-ghost btn-sm" (click)="respondPhoto(r, false)">Revoke</button>
                  }
                  @case ('Declined') { <span class="pill pill-muted">Declined</span> }
                }
              </div>
            </div>
          }
        </div>
      } @else {
        @let list = tab() === 'received' ? received() : sent();
        @if (list.length === 0) {
          <div class="empty">
            {{ tab() === 'received' ? 'No interests received yet.' : "You haven't sent any interests yet." }}
            <a routerLink="/search">Find matches</a>
          </div>
        }
        <div class="list">
          @for (i of list; track i.id) {
            <div class="card list-item">
              <ng-container *ngTemplateOutlet="avatar; context: { $implicit: i.profile }" />
              <div class="list-main">
                <a [routerLink]="['/profile', i.profile.userId]"><b>{{ i.profile.fullName }}</b></a>
                @if (i.profile.matchScore != null) { <span class="pill">{{ i.profile.matchScore }}% match</span> }
                <div class="muted">{{ summary(i.profile) }}</div>
                <div class="muted small">{{ i.createdAt | date: 'd MMM y, h:mm a' }}</div>
              </div>
              <div class="list-actions">
                @switch (i.status) {
                  @case ('Pending') {
                    @if (tab() === 'received') {
                      <button class="btn btn-primary btn-sm" (click)="respond(i, true)">Accept</button>
                      <button class="btn btn-ghost btn-sm" (click)="respond(i, false)">Decline</button>
                    } @else {
                      <span class="pill">Awaiting reply</span>
                      <button class="btn btn-ghost btn-sm" (click)="cancel(i)">Withdraw</button>
                    }
                  }
                  @case ('Accepted') {
                    <span class="pill pill-success">Connected</span>
                    <a class="btn btn-outline btn-sm" [routerLink]="['/messages', i.profile.userId]">Message</a>
                  }
                  @case ('Declined') { <span class="pill pill-muted">Declined</span> }
                }
              </div>
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class InterestsPage implements OnInit {
  api = inject(ApiService);
  /** Optional ?tab= query param, e.g. from the dashboard */
  tabParam = input<string>(undefined, { alias: 'tab' });
  tab = signal<Tab>('received');
  received = signal<Interest[]>([]);
  sent = signal<Interest[]>([]);
  photoRequests = signal<PhotoRequest[]>([]);
  error = signal('');
  initialsOf = initials;

  pendingPhotos = () => this.photoRequests().filter((r) => r.status === 'Pending').length;
  summary = (p: ProfileCard) => [`${p.age} yrs`, p.religion, p.occupation, p.city].filter(Boolean).join(' · ');

  ngOnInit() {
    const t = this.tabParam();
    if (t === 'sent' || t === 'photos') this.tab.set(t);
    this.api.receivedInterests().subscribe((r) => this.received.set(r));
    this.api.sentInterests().subscribe((r) => this.sent.set(r));
    this.api.photoRequests().subscribe((r) => this.photoRequests.set(r));
  }

  respond(i: Interest, accept: boolean) {
    this.api.respondInterest(i.id, accept).subscribe({
      next: () => this.received.update((list) => list.map((x) => (x.id === i.id ? { ...x, status: accept ? 'Accepted' : 'Declined' } : x))),
      error: (e) => this.error.set(errorMessage(e)),
    });
  }

  cancel(i: Interest) {
    this.api.cancelInterest(i.id).subscribe({
      next: () => this.sent.update((list) => list.filter((x) => x.id !== i.id)),
      error: (e) => this.error.set(errorMessage(e)),
    });
  }

  respondPhoto(r: PhotoRequest, approve: boolean) {
    this.api.respondPhotoRequest(r.id, approve).subscribe({
      next: () => this.photoRequests.update((list) => list.map((x) => (x.id === r.id ? { ...x, status: approve ? 'Approved' : 'Declined' } : x))),
      error: (e) => this.error.set(errorMessage(e)),
    });
  }
}

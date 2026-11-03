import { Component, OnInit, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { ProfileCard } from '../core/models';
import { ProfileCardComponent } from '../shared/profile-card';

@Component({
  selector: 'app-shortlist',
  imports: [RouterLink, ProfileCardComponent],
  template: `
    <div class="container page">
      <h1>Shortlist</h1>
      <div class="tabs">
        <button [class.active]="tab() === 'mine'" (click)="tab.set('mine')">My shortlist ({{ items().length }})</button>
        <button [class.active]="tab() === 'me'" (click)="tab.set('me')">Shortlisted me ({{ byOthers().length }})</button>
      </div>

      @if (tab() === 'mine') {
        @if (loaded() && items().length === 0) {
          <div class="empty">Nothing shortlisted yet. Tap ☆ Shortlist on any profile to save it here. <a routerLink="/search">Search profiles</a></div>
        }
        <div class="cards">
          @for (p of items(); track p.userId) {
            <div class="card-wrap">
              <app-profile-card [profile]="p" />
              <button class="btn btn-ghost btn-sm remove" (click)="remove(p)">Remove</button>
            </div>
          }
        </div>
      } @else {
        @if (loaded() && byOthers().length === 0) {
          <div class="empty">No one has shortlisted you yet. A complete profile with photos helps. <a routerLink="/my-profile">Improve my profile</a></div>
        }
        <div class="cards">
          @for (p of byOthers(); track p.userId) { <app-profile-card [profile]="p" /> }
        </div>
      }
    </div>
  `,
})
export class ShortlistPage implements OnInit {
  private api = inject(ApiService);
  tabParam = input<string>(undefined, { alias: 'tab' });
  tab = signal<'mine' | 'me'>('mine');
  items = signal<ProfileCard[]>([]);
  byOthers = signal<ProfileCard[]>([]);
  loaded = signal(false);

  ngOnInit() {
    if (this.tabParam() === 'me') this.tab.set('me');
    this.api.shortlist().subscribe((r) => { this.items.set(r); this.loaded.set(true); });
    this.api.shortlistedMe().subscribe((r) => this.byOthers.set(r));
  }

  remove(p: ProfileCard) {
    this.api.removeShortlist(p.userId).subscribe(() => this.items.update((l) => l.filter((x) => x.userId !== p.userId)));
  }
}

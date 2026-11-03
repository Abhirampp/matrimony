import { Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService, errorMessage } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { Story } from '../core/models';

@Component({
  selector: 'app-stories',
  imports: [DatePipe, FormsModule],
  template: `
    <div class="container page">
      <div class="section-head">
        <h1>💐 Success stories</h1>
        @if (canSubmit()) { <button class="btn btn-primary btn-sm" (click)="formOpen.set(!formOpen())">Share your story</button> }
      </div>
      <p class="muted">Couples who found each other on Vivaha.</p>

      @if (notice()) { <div class="alert alert-success">{{ notice() }}</div> }

      @if (formOpen()) {
        <form class="card story-form" (ngSubmit)="submit()">
          <h3>Share your story</h3>
          <p class="muted small">It appears here after our team reviews it. Please only share what both of you are happy to make public.</p>
          @if (error()) { <div class="alert alert-error">{{ error() }}</div> }
          <div class="grid-2">
            <label>Your names <input [(ngModel)]="f.coupleNames" name="coupleNames" placeholder="e.g. Ananya & Arjun" maxlength="100" required /></label>
            <label>Title <input [(ngModel)]="f.title" name="title" placeholder="e.g. Found my best friend" maxlength="120" required /></label>
            <label>Wedding date (optional) <input type="date" [(ngModel)]="f.weddingDate" name="weddingDate" /></label>
            <label>City (optional) <input [(ngModel)]="f.city" name="city" maxlength="60" /></label>
          </div>
          <label>Your story <span class="muted small">({{ f.story.length }}/3000, at least 40 characters)</span>
            <textarea rows="6" [(ngModel)]="f.story" name="story" maxlength="3000" required></textarea>
          </label>
          <div class="row gap">
            <button class="btn btn-primary" [disabled]="busy() || f.story.trim().length < 40 || !f.coupleNames.trim() || !f.title.trim()">
              {{ busy() ? 'Sending…' : 'Submit for review' }}</button>
            <button type="button" class="btn btn-ghost" (click)="formOpen.set(false)">Cancel</button>
          </div>
        </form>
      }

      @if (mine().length) {
        <div class="card small-card">
          <b>Your submissions</b>
          @for (s of mine(); track s.id) {
            <div class="row gap"><span class="grow">{{ s.title }}</span>
              <span class="pill" [class.pill-success]="s.status === 'Approved'" [class.pill-muted]="s.status === 'Declined'">
                {{ s.status === 'Pending' ? 'Waiting for review' : s.status === 'Approved' ? 'Published' : 'Not published' }}</span></div>
          }
        </div>
      }

      @if (loaded() && stories().length === 0) {
        <div class="empty">No stories yet. Found your partner here? Be the first to share!</div>
      }
      <div class="story-grid">
        @for (s of stories(); track s.id) {
          <article class="card story">
            <h3>{{ s.title }}</h3>
            <p class="muted small">{{ s.coupleNames }}{{ s.city ? ' · ' + s.city : '' }}{{ s.weddingDate ? ' · married ' + (s.weddingDate | date: 'MMM y') : '' }}</p>
            <p class="pre">{{ s.story }}</p>
          </article>
        }
      </div>
    </div>
  `,
})
export class StoriesPage {
  private api = inject(ApiService);
  private auth = inject(AuthService);
  stories = signal<Story[]>([]);
  mine = signal<Story[]>([]);
  loaded = signal(false);
  formOpen = signal(false);
  busy = signal(false);
  error = signal('');
  notice = signal('');
  f = { coupleNames: '', title: '', story: '', weddingDate: '', city: '' };

  canSubmit = () => this.auth.isLoggedIn() && !this.auth.isAdmin();

  constructor() {
    this.api.stories().subscribe((s) => { this.stories.set(s); this.loaded.set(true); });
    if (this.canSubmit()) this.api.myStories().subscribe((s) => this.mine.set(s));
  }

  submit() {
    this.busy.set(true);
    this.error.set('');
    this.api.submitStory({ ...this.f, weddingDate: this.f.weddingDate || null, city: this.f.city || null }).subscribe({
      next: (s) => {
        this.mine.update((l) => [s, ...l]);
        this.formOpen.set(false);
        this.busy.set(false);
        this.f = { coupleNames: '', title: '', story: '', weddingDate: '', city: '' };
        this.notice.set('Thank you! Your story will appear here once our team has reviewed it.');
      },
      error: (e) => { this.error.set(errorMessage(e)); this.busy.set(false); },
    });
  }
}

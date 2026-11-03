import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { Story } from '../core/models';

@Component({
  selector: 'app-home',
  imports: [RouterLink],
  template: `
    <section class="hero">
      <div class="container hero-inner">
        <div>
          <h1>Find your life partner,<br />the trusted way.</h1>
          <p class="lead">Verified profiles, privacy-first contact sharing and matches based on what matters to you.</p>
          <div class="row gap">
            <a routerLink="/register" class="btn btn-primary btn-lg">Register Free</a>
            <a routerLink="/login" class="btn btn-outline-light btn-lg">Login</a>
          </div>
        </div>
      </div>
    </section>

    <section class="container features">
      <div class="feature">
        <div class="feature-icon">📝</div>
        <h3>Create your profile</h3>
        <p>Add your details, photos and what you're looking for in a partner.</p>
      </div>
      <div class="feature">
        <div class="feature-icon">🔍</div>
        <h3>Search &amp; match</h3>
        <p>Filter by age, religion, mother tongue, location, education and more. See match % and horoscope compatibility.</p>
      </div>
      <div class="feature">
        <div class="feature-icon">💌</div>
        <h3>Send interest</h3>
        <p>Contact details and chat unlock only after both sides agree.</p>
      </div>
      <div class="feature">
        <div class="feature-icon">✔️</div>
        <h3>Verified &amp; safe</h3>
        <p>ID-verified badges, photo privacy, block and report – your safety comes first.</p>
      </div>
    </section>

    @if (stories().length) {
      <section class="container home-stories">
        <div class="section-head">
          <h2>💐 Success stories</h2>
          <a routerLink="/success-stories" class="muted">Read more →</a>
        </div>
        <div class="story-grid">
          @for (s of stories(); track s.id) {
            <article class="card story">
              <h3>{{ s.title }}</h3>
              <p class="muted small">{{ s.coupleNames }}{{ s.city ? ' · ' + s.city : '' }}</p>
              <p>{{ s.story.length > 220 ? s.story.slice(0, 220) + '…' : s.story }}</p>
            </article>
          }
        </div>
      </section>
    }

    <section class="container home-cta">
      <div class="card center-text">
        <h2>Go Premium</h2>
        <p class="muted">See who viewed you, contact members directly and get your profile seen first.</p>
        <a routerLink="/plans" class="btn btn-outline">See plans</a>
      </div>
    </section>
  `,
})
export class HomePage {
  private api = inject(ApiService);
  stories = signal<Story[]>([]);

  constructor() {
    this.api.stories(3).subscribe({ next: (s) => this.stories.set(s), error: () => {} });
  }
}

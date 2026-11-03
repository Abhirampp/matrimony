import { Component, OnChanges, inject, input, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService, errorMessage } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { ProfileDetail } from '../core/models';
import { REPORT_REASONS, heightLabel, initials } from '../shared/options';

@Component({
  selector: 'app-profile-view',
  imports: [RouterLink, DatePipe, FormsModule],
  template: `
    <div class="container page">
      @if (error()) {
        <div class="alert alert-error">{{ error() }}
          @if (upsell()) { <a routerLink="/plans" class="upsell-link">See plans →</a> }
        </div>
      }
      @if (notice()) { <div class="alert alert-success">{{ notice() }}</div> }
      @if (p(); as p) {
        @if (p.blockedByMe) {
          <div class="alert alert-info row gap">
            You have blocked this member. They can't see your profile or contact you.
            <button class="btn btn-outline btn-sm" (click)="unblock()">Unblock</button>
          </div>
        }
        <div class="card profile-hero">
          <div class="gallery">
            <div class="profile-photo">
              @if (current(); as src) {
                <img [src]="src" [alt]="p.fullName" />
              } @else if (p.photoLocked) {
                <div class="photo-locked big">
                  <span class="lock">🔒</span>
                  <span>Photos are protected</span>
                  @switch (p.photoRequestStatus) {
                    @case ('Pending') { <span class="pill">Request sent</span> }
                    @case ('Declined') { <button class="btn btn-outline btn-sm" (click)="requestPhotos()">Ask again</button> }
                    @default {
                      @if (!isSelf()) { <button class="btn btn-primary btn-sm" [disabled]="busy()" (click)="requestPhotos()">Request photos</button> }
                    }
                  }
                </div>
              } @else {
                <span class="avatar-initials big">{{ initialsOf(p.fullName) }}</span>
              }
            </div>
            @if (p.photos.length > 1) {
              <div class="thumbs">
                @for (ph of p.photos; track ph.id) {
                  <button class="thumb" [class.active]="api.photo(ph.url) === current()" (click)="current.set(api.photo(ph.url))">
                    <img [src]="api.photo(ph.url)" alt="" />
                  </button>
                }
              </div>
            }
          </div>

          <div class="profile-summary">
            <h1>{{ p.fullName }} @if (p.isVerified) { <span class="badge-verified inline">✔ Verified</span> }
              @if (p.isPremium) { <span class="badge-premium big">★ Premium</span> }</h1>
            <p class="lead">{{ p.age }} yrs · {{ height(p.heightCm) }} · {{ p.maritalStatus }}</p>
            <p>{{ p.religion }}{{ p.caste ? ' · ' + p.caste : '' }} · {{ p.motherTongue }}</p>
            <p>{{ p.education }} · {{ p.occupation }}</p>
            <p class="muted">📍 {{ p.city }}{{ p.state ? ', ' + p.state : '' }}{{ p.country ? ', ' + p.country : '' }}</p>
            @if (p.createdBy && p.createdBy !== 'Self') { <p class="muted small">Profile managed by {{ p.createdBy.toLowerCase() }}</p> }

            @if (!isSelf()) {
              <div class="score-row">
                @if (p.matchScore != null) {
                  <div class="score-chip" title="How well you fit each other's partner preferences">
                    <b>{{ p.matchScore }}%</b><span>preference match</span>
                  </div>
                }
                @if (p.horoscopeMatch; as h) {
                  <div class="score-chip">
                    <b>{{ h.score }}/{{ h.max }}</b><span>horoscope · {{ h.verdict }}</span>
                  </div>
                }
              </div>

              @if (!p.blockedByMe) {
                <div class="row gap actions">
                  @switch (p.interestStatus) {
                    @case ('Accepted') {
                      <span class="pill pill-success">✔ Connected</span>
                      <a class="btn btn-primary" [routerLink]="['/messages', p.userId]">💬 Message</a>
                    }
                    @case ('Pending') {
                      <span class="pill">{{ p.interestSentByMe ? 'Interest sent – awaiting reply' : 'They sent you an interest' }}</span>
                      @if (!p.interestSentByMe) { <a class="btn btn-primary" routerLink="/interests">Respond</a> }
                    }
                    @case ('Declined') { <span class="pill pill-muted">Interest declined</span> }
                    @default {
                      <button class="btn btn-primary" [disabled]="busy()" (click)="sendInterest()">💌 Send Interest</button>
                    }
                  }
                  <button class="btn btn-outline" [disabled]="busy()" (click)="toggleShortlist()">
                    {{ p.isShortlisted ? '★ Shortlisted' : '☆ Shortlist' }}
                  </button>
                </div>
              }
              <div class="row gap safety-links">
                @if (!p.blockedByMe) { <button class="link-btn" (click)="block()">🚫 Block</button> }
                <button class="link-btn" (click)="reportOpen.set(!reportOpen())">⚑ Report profile</button>
              </div>

              @if (reportOpen()) {
                <form class="card report-box" (ngSubmit)="sendReport()">
                  <h3>Report {{ p.fullName }}</h3>
                  <p class="muted small">Our team reviews every report. The member isn't told who reported them.</p>
                  <label>Reason
                    <select [(ngModel)]="reportReason" name="reason" required>
                      <option value="" disabled>Choose a reason</option>
                      @for (r of reasons; track r) { <option>{{ r }}</option> }
                    </select>
                  </label>
                  <label>Details (optional)
                    <textarea rows="3" [(ngModel)]="reportDetails" name="details" maxlength="1000"></textarea>
                  </label>
                  <div class="row gap">
                    <button class="btn btn-primary btn-sm" [disabled]="!reportReason || busy()">Send report</button>
                    <button type="button" class="btn btn-ghost btn-sm" (click)="reportOpen.set(false)">Cancel</button>
                  </div>
                </form>
              }
            } @else {
              <a routerLink="/my-profile" class="btn btn-outline">Edit my profile</a>
            }
          </div>
        </div>

        <div class="detail-grid">
          @if (p.about) {
            <div class="card span-2">
              <h3>About</h3>
              <p class="pre">{{ p.about }}</p>
            </div>
          }
          <div class="card">
            <h3>Basic details</h3>
            <dl>
              <dt>Date of birth</dt><dd>{{ p.dateOfBirth | date: 'd MMM y' }}</dd>
              <dt>Height</dt><dd>{{ height(p.heightCm) || '—' }}</dd>
              <dt>Marital status</dt><dd>{{ p.maritalStatus }}</dd>
              <dt>Mother tongue</dt><dd>{{ p.motherTongue || '—' }}</dd>
              <dt>Residency</dt><dd>{{ p.residencyStatus || '—' }}</dd>
            </dl>
          </div>
          <div class="card">
            <h3>Education &amp; career</h3>
            <dl>
              <dt>Education</dt><dd>{{ p.education || '—' }}</dd>
              <dt>Occupation</dt><dd>{{ p.occupation || '—' }}</dd>
              <dt>Annual income</dt><dd>{{ p.annualIncome || '—' }}</dd>
            </dl>
          </div>
          <div class="card">
            <h3>Family</h3>
            <dl>
              <dt>Family type</dt><dd>{{ p.familyType || '—' }}</dd>
              <dt>Family values</dt><dd>{{ p.familyValues || '—' }}</dd>
              <dt>Father</dt><dd>{{ p.fatherOccupation || '—' }}</dd>
              <dt>Mother</dt><dd>{{ p.motherOccupation || '—' }}</dd>
              <dt>Siblings</dt><dd>{{ siblings(p) }}</dd>
            </dl>
          </div>
          <div class="card">
            <h3>Lifestyle</h3>
            <dl>
              <dt>Diet</dt><dd>{{ p.diet || '—' }}</dd>
              <dt>Smoking</dt><dd>{{ p.smoking || '—' }}</dd>
              <dt>Drinking</dt><dd>{{ p.drinking || '—' }}</dd>
            </dl>
          </div>
          <div class="card">
            <h3>Horoscope</h3>
            <dl>
              <dt>Rasi (moon sign)</dt><dd>{{ p.rasi || '—' }}</dd>
              <dt>Nakshatra</dt><dd>{{ p.nakshatra || '—' }}</dd>
              <dt>Manglik</dt><dd>{{ p.manglik || '—' }}</dd>
              <dt>Birth time</dt><dd>{{ p.birthTime || (isSelf() ? '—' : '🔒 After connecting') }}</dd>
              <dt>Birth place</dt><dd>{{ p.birthPlace || (isSelf() ? '—' : '🔒 After connecting') }}</dd>
            </dl>
          </div>
          @if (p.horoscopeMatch; as h) {
            <div class="card">
              <h3>Horoscope compatibility</h3>
              <p><b>{{ h.score }} / {{ h.max }}</b> · {{ h.verdict }}</p>
              <div class="koota-list">
                @for (k of h.kootas; track k.name) {
                  <div class="koota">
                    <span>{{ k.name }} <span class="muted small">({{ k.meaning }})</span></span>
                    <span class="bar"><span [style.width.%]="(k.points / k.max) * 100"></span></span>
                    <b>{{ k.points }}/{{ k.max }}</b>
                  </div>
                }
              </div>
              @if (h.manglikNote) { <p class="alert alert-info small">{{ h.manglikNote }}</p> }
              <p class="muted small">Simplified check using 4 of the 8 traditional factors. Consult an astrologer for a full reading.</p>
            </div>
          } @else if (!isSelf()) {
            <div class="card">
              <h3>Horoscope compatibility</h3>
              <p class="muted">Both of you need a rasi and nakshatra on your profiles to see this.
                <a routerLink="/my-profile">Add yours</a></p>
            </div>
          }
          <div class="card">
            <h3>Partner preferences</h3>
            <dl>
              <dt>Age</dt><dd>{{ p.prefAgeMin || '—' }} – {{ p.prefAgeMax || '—' }} yrs</dd>
              <dt>Min height</dt><dd>{{ height(p.prefHeightMin) || 'Any' }}</dd>
              <dt>Religion</dt><dd>{{ p.prefReligion || 'Any' }}</dd>
              <dt>Mother tongue</dt><dd>{{ p.prefMotherTongue || 'Any' }}</dd>
              <dt>Marital status</dt><dd>{{ p.prefMaritalStatus || 'Any' }}</dd>
            </dl>
          </div>
          <div class="card">
            <h3>Contact details</h3>
            @if (p.email) {
              <dl>
                <dt>Email</dt><dd>{{ p.email }}</dd>
                <dt>Phone</dt><dd>{{ p.phone || '—' }}</dd>
              </dl>
              @if (p.contactUnlocked) { <p class="muted small">Unlocked with your plan.</p> }
            } @else {
              <p class="muted">🔒 Contact details are shown once your interest is accepted.</p>
              @if (!isSelf() && !p.blockedByMe) {
                <p class="muted small">Premium members can see them now.</p>
                <button class="btn btn-outline btn-sm" [disabled]="busy()" (click)="viewContact()">📞 View contact details</button>
              }
            }
            @if (creditsLeft() !== null) { <p class="muted small">{{ creditsLeft() }} contact views left in your plan.</p> }
          </div>
        </div>
      } @else if (!error()) {
        <p class="muted">Loading profile…</p>
      }
    </div>
  `,
})
export class ProfileViewPage implements OnChanges {
  api = inject(ApiService);
  private auth = inject(AuthService);

  id = input.required<string>();
  p = signal<ProfileDetail | null>(null);
  current = signal<string | null>(null);
  error = signal('');
  notice = signal('');
  busy = signal(false);
  reportOpen = signal(false);
  upsell = signal(false);
  creditsLeft = signal<number | null>(null);
  reportReason = '';
  reportDetails = '';
  reasons = REPORT_REASONS;
  height = heightLabel;
  initialsOf = initials;

  isSelf = () => this.p()?.userId === this.auth.user()?.userId;

  siblings(p: ProfileDetail) {
    if (p.brothers == null && p.sisters == null) return '—';
    return `${p.brothers ?? 0} brother(s), ${p.sisters ?? 0} sister(s)`;
  }

  ngOnChanges() {
    this.p.set(null);
    this.error.set('');
    this.notice.set('');
    this.reportOpen.set(false);
    this.load();
  }

  private load() {
    this.api.profile(+this.id()).subscribe({
      next: (p) => {
        this.p.set(p);
        this.current.set(this.api.photo(p.photoUrl));
      },
      error: (e) => this.error.set(e.status === 404 ? 'This profile is not available.' : errorMessage(e)),
    });
  }

  private act(call: ReturnType<ApiService['block']>, onDone: () => void) {
    this.busy.set(true);
    this.error.set('');
    this.upsell.set(false);
    call.subscribe({
      next: () => { onDone(); this.busy.set(false); },
      error: (e) => this.fail(e),
    });
  }

  /** 402 = needs a paid plan, 429 = daily limit reached: both get a link to the plans page. */
  private fail(e: any) {
    this.error.set(errorMessage(e));
    this.upsell.set(e?.status === 402 || e?.status === 429);
    this.busy.set(false);
  }

  viewContact() {
    const p = this.p()!;
    this.busy.set(true);
    this.error.set('');
    this.upsell.set(false);
    this.api.unlockContact(p.userId).subscribe({
      next: (c) => {
        this.p.set({ ...p, email: c.email, phone: c.phone, contactUnlocked: p.interestStatus !== 'Accepted' });
        this.creditsLeft.set(c.contactViewsLeft);
        this.busy.set(false);
      },
      error: (e) => this.fail(e),
    });
  }

  sendInterest() {
    const p = this.p()!;
    this.act(this.api.sendInterest(p.userId), () => this.p.set({ ...p, interestStatus: 'Pending', interestSentByMe: true }));
  }

  toggleShortlist() {
    const p = this.p()!;
    const call = p.isShortlisted ? this.api.removeShortlist(p.userId) : this.api.addShortlist(p.userId);
    this.act(call, () => this.p.set({ ...p, isShortlisted: !p.isShortlisted }));
  }

  requestPhotos() {
    const p = this.p()!;
    this.act(this.api.requestPhotos(p.userId), () => {
      this.p.set({ ...p, photoRequestStatus: 'Pending' });
      this.notice.set(`Photo request sent. You'll see ${p.fullName.split(' ')[0]}'s photos if they approve.`);
    });
  }

  block() {
    const p = this.p()!;
    if (!confirm(`Block ${p.fullName}? They won't be able to see your profile or contact you.`)) return;
    this.act(this.api.block(p.userId), () => {
      this.p.set({ ...p, blockedByMe: true, isShortlisted: false });
      this.notice.set(`${p.fullName} is blocked. You can unblock them from My Profile → Privacy & safety.`);
    });
  }

  unblock() {
    const p = this.p()!;
    this.act(this.api.unblock(p.userId), () => { this.notice.set(`${p.fullName} is unblocked.`); this.load(); });
  }

  sendReport() {
    const p = this.p()!;
    this.act(this.api.report(p.userId, this.reportReason, this.reportDetails), () => {
      this.reportOpen.set(false);
      this.reportReason = '';
      this.reportDetails = '';
      this.notice.set('Thanks for reporting. Our team will review this profile.');
    });
  }
}

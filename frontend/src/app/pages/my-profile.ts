import { Component, inject, input, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService, errorMessage } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { Account, BlockedUser, Completeness, Gender, Photo, PhotoVisibility, ProfileUpdate, VerificationStatus } from '../core/models';
import {
  CREATED_BY, DIETS, EDUCATION, FAMILY_TYPES, FAMILY_VALUES, HABITS, HEIGHTS, ID_DOCUMENTS, INCOMES, MANGLIK, MARITAL_STATUSES,
  MAX_PHOTOS, MOTHER_TONGUES, NAKSHATRAS, RASIS, RELIGIONS, RESIDENCY, initials,
} from '../shared/options';

@Component({
  selector: 'app-my-profile',
  imports: [ReactiveFormsModule, FormsModule, RouterLink],
  template: `
    <div class="container page narrow">
      @if (welcome()) {
        <div class="alert alert-info">🎉 Welcome! Complete your profile so the right matches can find you.</div>
      }
      <div class="section-head">
        <h1>My Profile</h1>
        @if (userId()) { <a [routerLink]="['/profile', userId()]" class="muted">Preview public profile →</a> }
      </div>

      @if (completeness(); as c) {
        <div class="card completeness">
          <div class="row gap">
            <b>Profile {{ c.percent }}% complete</b>
            <span class="meter grow"><span [style.width.%]="c.percent"></span></span>
          </div>
          @if (c.missing.length) { <p class="muted small">Add: {{ c.missing.join(', ') }}</p> }
        </div>
      }

      <!-- Photos -->
      <div class="card">
        <div class="section-head">
          <h3>Photos <span class="muted small">({{ photos().length }}/{{ maxPhotos }})</span></h3>
          @if (photos().length < maxPhotos) {
            <label class="btn btn-outline btn-sm file-btn">
              {{ uploading() ? 'Uploading…' : '+ Add photo' }}
              <input type="file" accept="image/png,image/jpeg,image/webp" (change)="upload($event)" hidden />
            </label>
          }
        </div>
        <p class="muted small">JPG, PNG or WEBP, up to 2 MB each. Profiles with photos get far more responses.</p>
        @if (photoMessage()) { <div class="alert" [class.alert-error]="photoError()" [class.alert-success]="!photoError()">{{ photoMessage() }}</div> }
        @if (photos().length === 0) {
          <div class="empty small-empty">No photos yet.</div>
        } @else {
          <div class="album">
            @for (ph of photos(); track ph.id) {
              <div class="album-item" [class.primary]="ph.isPrimary">
                <img [src]="api.photo(ph.url)" alt="My photo" />
                @if (ph.isPrimary) { <span class="pill primary-pill">Main</span> }
                <div class="album-actions">
                  @if (!ph.isPrimary) { <button class="btn btn-ghost btn-sm" (click)="makePrimary(ph)">Make main</button> }
                  <button class="btn btn-ghost btn-sm" (click)="deletePhoto(ph)">Delete</button>
                </div>
              </div>
            }
          </div>
        }
      </div>

      <form [formGroup]="form" (ngSubmit)="save()">
        <div class="card">
          <h3>Basic details</h3>
          <div class="grid-2">
            <label>Full name <input formControlName="fullName" /></label>
            <label>Profile created by
              <select formControlName="createdBy">@for (c of createdBy; track c) { <option>{{ c }}</option> }</select>
            </label>
            <label>Gender
              <select formControlName="gender"><option>Male</option><option>Female</option></select>
            </label>
            <label>Date of birth <input type="date" formControlName="dateOfBirth" /></label>
            <label>Marital status
              <select formControlName="maritalStatus">@for (m of marital; track m) { <option>{{ m }}</option> }</select>
            </label>
            <label>Height
              <select formControlName="heightCm">
                <option [ngValue]="null">Select</option>
                @for (h of heights; track h.cm) { <option [ngValue]="h.cm">{{ h.label }}</option> }
              </select>
            </label>
            <label>Mother tongue
              <select formControlName="motherTongue">
                <option [ngValue]="null">Select</option>
                @for (t of tongues; track t) { <option>{{ t }}</option> }
              </select>
            </label>
            <label>Religion
              <select formControlName="religion">
                <option [ngValue]="null">Select</option>
                @for (r of religions; track r) { <option>{{ r }}</option> }
              </select>
            </label>
            <label>Caste / community <input formControlName="caste" /></label>
          </div>
        </div>

        <div class="card">
          <h3>Education, career &amp; location</h3>
          <div class="grid-2">
            <label>Highest education
              <select formControlName="education">
                <option [ngValue]="null">Select</option>
                @for (e of education; track e) { <option>{{ e }}</option> }
              </select>
            </label>
            <label>Occupation <input formControlName="occupation" /></label>
            <label>Annual income
              <select formControlName="annualIncome">
                <option [ngValue]="null">Select</option>
                @for (i of incomes; track i) { <option>{{ i }}</option> }
              </select>
            </label>
            <label>Residency status
              <select formControlName="residencyStatus">
                <option [ngValue]="null">Select</option>
                @for (r of residency; track r) { <option>{{ r }}</option> }
              </select>
            </label>
            <label>City <input formControlName="city" /></label>
            <label>State <input formControlName="state" /></label>
            <label>Country <input formControlName="country" /></label>
          </div>
          <label>About me
            <textarea rows="4" formControlName="about" maxlength="2000"
              placeholder="A few lines about yourself, your family and what you're looking for"></textarea>
          </label>
        </div>

        <div class="card">
          <h3>Family</h3>
          <div class="grid-2">
            <label>Family type
              <select formControlName="familyType">
                <option [ngValue]="null">Select</option>
                @for (f of familyTypes; track f) { <option>{{ f }}</option> }
              </select>
            </label>
            <label>Family values
              <select formControlName="familyValues">
                <option [ngValue]="null">Select</option>
                @for (f of familyValues; track f) { <option>{{ f }}</option> }
              </select>
            </label>
            <label>Father's occupation <input formControlName="fatherOccupation" /></label>
            <label>Mother's occupation <input formControlName="motherOccupation" /></label>
            <label>Brothers <input type="number" min="0" max="20" formControlName="brothers" /></label>
            <label>Sisters <input type="number" min="0" max="20" formControlName="sisters" /></label>
          </div>
        </div>

        <div class="card">
          <h3>Lifestyle</h3>
          <div class="grid-3">
            <label>Diet
              <select formControlName="diet">
                <option [ngValue]="null">Select</option>
                @for (d of diets; track d) { <option>{{ d }}</option> }
              </select>
            </label>
            <label>Smoking
              <select formControlName="smoking">
                <option [ngValue]="null">Select</option>
                @for (h of habits; track h) { <option>{{ h }}</option> }
              </select>
            </label>
            <label>Drinking
              <select formControlName="drinking">
                <option [ngValue]="null">Select</option>
                @for (h of habits; track h) { <option>{{ h }}</option> }
              </select>
            </label>
          </div>
        </div>

        <div class="card">
          <h3>Horoscope</h3>
          <p class="muted small">Used for horoscope compatibility. Birth time and place are only shown to people you've connected with.</p>
          <div class="grid-2">
            <label>Rasi (moon sign)
              <select formControlName="rasi">
                <option [ngValue]="null">Select</option>
                @for (r of rasis; track r) { <option>{{ r }}</option> }
              </select>
            </label>
            <label>Nakshatra (birth star)
              <select formControlName="nakshatra">
                <option [ngValue]="null">Select</option>
                @for (n of nakshatras; track n) { <option>{{ n }}</option> }
              </select>
            </label>
            <label>Manglik
              <select formControlName="manglik">
                <option [ngValue]="null">Select</option>
                @for (m of manglik; track m) { <option>{{ m }}</option> }
              </select>
            </label>
            <label>Time of birth <input type="time" formControlName="birthTime" /></label>
            <label>Place of birth <input formControlName="birthPlace" /></label>
          </div>
        </div>

        <div class="card">
          <h3>Partner preferences</h3>
          <div class="grid-2">
            <label>Age from <input type="number" min="18" max="80" formControlName="prefAgeMin" /></label>
            <label>Age to <input type="number" min="18" max="80" formControlName="prefAgeMax" /></label>
            <label>Min height
              <select formControlName="prefHeightMin">
                <option [ngValue]="null">Any</option>
                @for (h of heights; track h.cm) { <option [ngValue]="h.cm">{{ h.label }}</option> }
              </select>
            </label>
            <label>Religion
              <select formControlName="prefReligion">
                <option [ngValue]="null">Any</option>
                @for (r of religions; track r) { <option>{{ r }}</option> }
              </select>
            </label>
            <label>Mother tongue
              <select formControlName="prefMotherTongue">
                <option [ngValue]="null">Any</option>
                @for (t of tongues; track t) { <option>{{ t }}</option> }
              </select>
            </label>
            <label>Marital status
              <select formControlName="prefMaritalStatus">
                <option [ngValue]="null">Any</option>
                @for (m of marital; track m) { <option>{{ m }}</option> }
              </select>
            </label>
          </div>
        </div>

        @if (message()) { <div class="alert" [class.alert-error]="isError()" [class.alert-success]="!isError()">{{ message() }}</div> }
        <div class="row gap sticky-actions">
          <button class="btn btn-primary" [disabled]="form.invalid || saving()">{{ saving() ? 'Saving…' : 'Save profile' }}</button>
        </div>
      </form>

      <!-- Account & security -->
      <div class="card" id="account">
        <div class="section-head">
          <h3>Account &amp; security</h3>
          <span class="small"><a routerLink="/plans">Plan</a> · <a routerLink="/billing">Billing</a></span>
        </div>
        @if (acct(); as a) {
          <div class="acct-row">
            <div class="grow">
              <span class="muted small">Email</span>
              <div>{{ a.email }}
                @if (a.emailVerified) { <span class="pill pill-success">✔ Confirmed</span> } @else { <span class="pill">Not confirmed</span> }</div>
            </div>
            @if (!a.emailVerified) {
              <button class="btn btn-outline btn-sm" [disabled]="acctBusy()" (click)="resendEmail()">Send confirmation link</button>
            }
          </div>

          <div class="acct-row">
            <div class="grow">
              <span class="muted small">Mobile number</span>
              @if (a.phoneVerified && !changingPhone()) {
                <div>{{ a.phone }} <span class="pill pill-success">✔ Verified</span>
                  <button class="link-btn" (click)="changingPhone.set(true)">Change</button></div>
              } @else {
                <div class="row gap">
                  <input type="tel" [(ngModel)]="phone" name="phone" placeholder="+91 98765 43210" class="phone-input" />
                  <button class="btn btn-outline btn-sm" [disabled]="acctBusy() || !phone.trim()" (click)="sendOtp()">
                    {{ otpSent() ? 'Resend code' : 'Send code' }}</button>
                </div>
                @if (otpSent()) {
                  <div class="row gap mt-s">
                    <input inputmode="numeric" maxlength="6" [(ngModel)]="otp" name="otp" placeholder="6-digit code" class="otp-input"
                      autocomplete="one-time-code" />
                    <button class="btn btn-primary btn-sm" [disabled]="acctBusy() || otp.length !== 6" (click)="verifyOtp()">Verify</button>
                  </div>
                }
              }
            </div>
          </div>
          @if (acctMsg()) { <p class="alert small" [class.alert-error]="acctErr()" [class.alert-success]="!acctErr()">{{ acctMsg() }}</p> }

          <details class="pw-box">
            <summary>Change password</summary>
            <div class="grid-3">
              <label>Current password <input type="password" [(ngModel)]="pw.current" name="pwCurrent" autocomplete="current-password" /></label>
              <label>New password <input type="password" [(ngModel)]="pw.next" name="pwNext" autocomplete="new-password" /></label>
              <label>Confirm <input type="password" [(ngModel)]="pw.confirm" name="pwConfirm" autocomplete="new-password" /></label>
            </div>
            <button class="btn btn-outline btn-sm" [disabled]="acctBusy() || !pw.current || pw.next.length < 6 || pw.next !== pw.confirm"
              (click)="changePassword()">Change password</button>
            @if (pw.confirm && pw.next !== pw.confirm) { <span class="muted small"> Passwords don't match.</span> }
          </details>
        }
      </div>

      <!-- ID verification -->
      <div class="card" id="verification">
        <h3>ID verification</h3>
        @if (verification(); as v) {
          @if (v.isVerified) {
            <p><span class="badge-verified inline">✔ Verified</span> Your ID has been checked. Verified profiles get more responses.</p>
          } @else if (v.status === 'Pending') {
            <p><span class="pill">Under review</span> We received your {{ v.documentType }}. An admin will review it soon.</p>
          } @else {
            @if (v.status === 'Declined') {
              <div class="alert alert-error small">Your last document couldn't be verified: {{ v.adminNote }}. Please upload a clearer one.</div>
            }
            <p class="muted small">Upload a government ID to earn the ✔ Verified badge. Only our admin team sees it, and it's
              deleted once checked. JPG, PNG or PDF, up to 5 MB.</p>
            <div class="row gap">
              <select [(ngModel)]="docType" name="docType" class="doc-select">
                <option value="" disabled>Document type</option>
                @for (d of docTypes; track d) { <option>{{ d }}</option> }
              </select>
              <label class="btn btn-primary btn-sm file-btn" [class.disabled]="!docType || verifying()">
                {{ verifying() ? 'Uploading…' : 'Upload ID' }}
                <input type="file" accept="image/png,image/jpeg,application/pdf" (change)="uploadId($event)" [disabled]="!docType || verifying()" hidden />
              </label>
            </div>
            @if (verifyError()) { <p class="alert alert-error small">{{ verifyError() }}</p> }
          }
        }
      </div>

      <!-- Privacy & safety -->
      <div class="card" id="privacy">
        <h3>Privacy &amp; safety</h3>
        <label>Who can see my photos
          <select [(ngModel)]="visibility" name="visibility" (ngModelChange)="savePrivacy()">
            <option value="Everyone">Everyone</option>
            <option value="Protected">Only connections and people I approve</option>
          </select>
        </label>
        <label class="check">
          <input type="checkbox" [(ngModel)]="hidden" name="hidden" (ngModelChange)="savePrivacy()" />
          Hide my profile from search and matches
        </label>
        <p class="muted small">Hidden profiles can still chat with existing connections. Turn it off any time.</p>
        @if (privacyMessage()) { <p class="alert alert-success small">{{ privacyMessage() }}</p> }

        <h3 class="mt">Blocked members</h3>
        @if (blocked().length === 0) {
          <p class="muted">You haven't blocked anyone.</p>
        } @else {
          @for (b of blocked(); track b.userId) {
            <div class="row gap blocked-row">
              <span class="grow">{{ b.fullName }}</span>
              <button class="btn btn-ghost btn-sm" (click)="unblock(b)">Unblock</button>
            </div>
          }
        }
      </div>
    </div>
  `,
})
export class MyProfilePage {
  api = inject(ApiService);
  private auth = inject(AuthService);
  private fb = inject(FormBuilder);

  welcome = input<string>();
  religions = RELIGIONS;
  tongues = MOTHER_TONGUES;
  marital = MARITAL_STATUSES;
  education = EDUCATION;
  incomes = INCOMES;
  familyTypes = FAMILY_TYPES;
  familyValues = FAMILY_VALUES;
  createdBy = CREATED_BY;
  residency = RESIDENCY;
  diets = DIETS;
  habits = HABITS;
  manglik = MANGLIK;
  rasis = RASIS;
  nakshatras = NAKSHATRAS;
  heights = HEIGHTS;
  maxPhotos = MAX_PHOTOS;
  initialsOf = initials;

  userId = signal<number | null>(null);
  photos = signal<Photo[]>([]);
  completeness = signal<Completeness | null>(null);
  blocked = signal<BlockedUser[]>([]);
  saving = signal(false);
  uploading = signal(false);
  message = signal('');
  isError = signal(false);
  privacyMessage = signal('');
  photoMessage = signal('');
  photoError = signal(false);
  visibility: PhotoVisibility = 'Everyone';
  hidden = false;

  form = this.fb.group({
    fullName: ['', [Validators.required, Validators.maxLength(100)]],
    createdBy: ['Self' as string | null],
    gender: ['Female' as Gender, Validators.required],
    dateOfBirth: ['', Validators.required],
    maritalStatus: ['Never Married', Validators.required],
    heightCm: [null as number | null],
    motherTongue: [null as string | null],
    religion: [null as string | null],
    caste: [null as string | null],
    education: [null as string | null],
    occupation: [null as string | null],
    annualIncome: [null as string | null],
    residencyStatus: [null as string | null],
    city: [null as string | null],
    state: [null as string | null],
    country: ['India' as string | null],
    about: [null as string | null],
    familyType: [null as string | null],
    familyValues: [null as string | null],
    fatherOccupation: [null as string | null],
    motherOccupation: [null as string | null],
    brothers: [null as number | null, [Validators.min(0), Validators.max(20)]],
    sisters: [null as number | null, [Validators.min(0), Validators.max(20)]],
    diet: [null as string | null],
    smoking: [null as string | null],
    drinking: [null as string | null],
    rasi: [null as string | null],
    nakshatra: [null as string | null],
    manglik: [null as string | null],
    birthTime: [null as string | null],
    birthPlace: [null as string | null],
    prefAgeMin: [null as number | null],
    prefAgeMax: [null as number | null],
    prefHeightMin: [null as number | null],
    prefReligion: [null as string | null],
    prefMotherTongue: [null as string | null],
    prefMaritalStatus: [null as string | null],
  });

  verification = signal<VerificationStatus | null>(null);
  verifying = signal(false);
  verifyError = signal('');
  docTypes = ID_DOCUMENTS;
  docType = '';

  constructor() {
    this.reload();
    this.api.blocked().subscribe((b) => this.blocked.set(b));
    this.api.verificationStatus().subscribe((v) => this.verification.set(v));
    this.api.account().subscribe((a) => { this.acct.set(a); this.phone = a.phone ?? ''; });
  }

  acct = signal<Account | null>(null);
  acctBusy = signal(false);
  acctMsg = signal('');
  acctErr = signal(false);
  otpSent = signal(false);
  changingPhone = signal(false);
  phone = '';
  otp = '';
  pw = { current: '', next: '', confirm: '' };

  private acctDone(msg: string, error = false) {
    this.acctMsg.set(msg);
    this.acctErr.set(error);
    this.acctBusy.set(false);
  }

  /** In local development, emails/SMS go to the admin's Dev outbox instead of being sent. */
  private deliveryNote(d: string) {
    return d === 'DevOutbox' ? ' (Development: no provider is set up, so it is in the admin Dev outbox.)'
      : d === 'NotConfigured' || d === 'Failed' ? ' (Sending failed – please try again later.)' : '';
  }

  resendEmail() {
    this.acctBusy.set(true);
    this.api.sendEmailVerification().subscribe({
      next: (r) => this.acctDone(`We've emailed you a confirmation link.${this.deliveryNote(r.delivery)}`),
      error: (e) => this.acctDone(errorMessage(e), true),
    });
  }

  sendOtp() {
    this.acctBusy.set(true);
    this.api.sendOtp(this.phone.replace(/[\s-]/g, '')).subscribe({
      next: (r) => { this.otpSent.set(true); this.acctDone(`We've sent a 6-digit code by SMS.${this.deliveryNote(r.delivery)}`); },
      error: (e) => this.acctDone(errorMessage(e), true),
    });
  }

  verifyOtp() {
    this.acctBusy.set(true);
    this.api.verifyOtp(this.otp).subscribe({
      next: (a) => {
        this.acct.set(a);
        this.otpSent.set(false);
        this.changingPhone.set(false);
        this.otp = '';
        this.acctDone('Your mobile number is verified.');
      },
      error: (e) => this.acctDone(errorMessage(e), true),
    });
  }

  changePassword() {
    this.acctBusy.set(true);
    this.auth.changePassword(this.pw.current, this.pw.next).subscribe({
      next: () => { this.pw = { current: '', next: '', confirm: '' }; this.acctDone('Password changed.'); },
      error: (e) => this.acctDone(errorMessage(e), true),
    });
  }

  uploadId(ev: Event) {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file || !this.docType) return;
    if (file.size > 5 * 1024 * 1024) { this.verifyError.set('The file must be 5 MB or smaller.'); return; }
    this.verifying.set(true);
    this.verifyError.set('');
    this.api.submitVerification(this.docType, file).subscribe({
      next: (v) => { this.verification.set(v); this.verifying.set(false); },
      error: (e) => { this.verifyError.set(errorMessage(e)); this.verifying.set(false); },
    });
  }

  private reload() {
    this.api.myProfile().subscribe((p) => {
      this.userId.set(p.userId);
      this.photos.set(p.photos);
      this.completeness.set(p.completeness ?? null);
      this.visibility = p.photoVisibility;
      this.hidden = p.isHidden;
      this.form.patchValue({ ...p, dateOfBirth: p.dateOfBirth.slice(0, 10) } as any);
    });
  }

  save() {
    if (this.form.invalid) return;
    this.saving.set(true);
    this.message.set('');
    const value = this.form.getRawValue() as ProfileUpdate;
    // Empty inputs come back as '' – send null instead
    for (const [k, v] of Object.entries(value)) if (v === '') (value as any)[k] = null;
    this.api.updateMyProfile(value).subscribe({
      next: () => {
        this.auth.updateName(value.fullName);
        this.flash('Profile saved.', false);
        this.saving.set(false);
        this.reload();
      },
      error: (e) => { this.flash(errorMessage(e), true); this.saving.set(false); },
    });
  }

  upload(ev: Event) {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { this.photoFlash('Photo must be 2 MB or smaller.', true); return; }
    this.uploading.set(true);
    this.api.uploadPhoto(file).subscribe({
      next: (list) => { this.photos.set(list); this.uploading.set(false); this.photoFlash('Photo added.', false); this.reload(); },
      error: (e) => { this.photoFlash(errorMessage(e), true); this.uploading.set(false); },
    });
  }

  makePrimary(ph: Photo) {
    this.api.makePrimaryPhoto(ph.id).subscribe((list) => this.photos.set(list));
  }

  deletePhoto(ph: Photo) {
    if (!confirm('Delete this photo?')) return;
    this.api.deletePhoto(ph.id).subscribe(() => this.reload());
  }

  savePrivacy() {
    this.api.updatePrivacy(this.visibility, this.hidden).subscribe({
      next: () => this.privacyMessage.set('Privacy settings saved.'),
      error: (e) => this.privacyMessage.set(errorMessage(e)),
    });
  }

  unblock(b: BlockedUser) {
    this.api.unblock(b.userId).subscribe(() => this.blocked.update((l) => l.filter((x) => x.userId !== b.userId)));
  }

  private photoFlash(msg: string, error: boolean) {
    this.photoMessage.set(msg);
    this.photoError.set(error);
  }

  private flash(msg: string, error: boolean) {
    this.message.set(msg);
    this.isError.set(error);
  }
}

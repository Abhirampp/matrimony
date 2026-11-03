import { Component, inject, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService, errorMessage } from '../core/api.service';
import { AdminOrder, AdminReport, AdminStats, AdminUser, AdminVerification, OutboxMessage, Story } from '../core/models';

@Component({
  selector: 'app-admin',
  imports: [FormsModule, DatePipe, DecimalPipe, RouterLink],
  template: `
    <div class="container page">
      <h1>Admin dashboard</h1>
      @if (stats(); as s) {
        <div class="stats">
          <div class="stat"><b>{{ s.totalUsers }}</b><span>Members</span></div>
          <div class="stat"><b>{{ s.activeUsers }}</b><span>Active</span></div>
          <div class="stat"><b>{{ s.male }} / {{ s.female }}</b><span>Male / Female</span></div>
          <div class="stat"><b>{{ s.verifiedProfiles }}</b><span>Verified</span></div>
          <div class="stat"><b>{{ s.interests }}</b><span>Interests ({{ s.acceptedInterests }} accepted)</span></div>
          <div class="stat"><b>{{ s.messages }}</b><span>Messages</span></div>
          <button class="stat stat-btn" [class.alert-stat]="s.openReports > 0" (click)="showReports()">
            <b>{{ s.openReports }}</b><span>Open reports</span>
          </button>
          <button class="stat stat-btn" [class.alert-stat]="s.pendingVerifications > 0" (click)="showVerifications()">
            <b>{{ s.pendingVerifications }}</b><span>IDs to verify</span>
          </button>
          <button class="stat stat-btn" [class.alert-stat]="s.pendingStories > 0" (click)="showStories()">
            <b>{{ s.pendingStories }}</b><span>Stories to review</span>
          </button>
          <button class="stat stat-btn" (click)="showPayments()">
            <b>₹{{ s.revenue.totalPaise / 100 | number }}</b><span>Revenue · {{ s.revenue.activeGold }} Gold, {{ s.revenue.activePlatinum }} Platinum active</span>
          </button>
        </div>
      }

      <div class="tabs">
        <button [class.active]="tab() === 'members'" (click)="tab.set('members')">Members</button>
        <button [class.active]="tab() === 'reports'" (click)="showReports()">Reports</button>
        <button [class.active]="tab() === 'verifications'" (click)="showVerifications()">ID verification</button>
        <button [class.active]="tab() === 'payments'" (click)="showPayments()">Payments</button>
        <button [class.active]="tab() === 'stories'" (click)="showStories()">Stories</button>
        <button [class.active]="tab() === 'outbox'" (click)="showOutbox()">Dev outbox</button>
      </div>
      @if (notice()) { <div class="alert alert-success">{{ notice() }}</div> }
      @if (error()) { <div class="alert alert-error">{{ error() }}</div> }

      @if (tab() === 'members') {
        <div class="card">
          <form class="row gap" (ngSubmit)="load(1)">
            <input [(ngModel)]="q" name="q" placeholder="Search by name or email" class="grow" />
            <button class="btn btn-primary">Search</button>
          </form>
          <div class="table-wrap">
            <table>
              <thead>
                <tr><th>Name</th><th>Email</th><th>Joined</th><th>Last login</th><th>Status</th><th></th></tr>
              </thead>
              <tbody>
                @for (u of users(); track u.id) {
                  <tr>
                    <td><a [routerLink]="['/profile', u.id]">{{ u.fullName }}</a></td>
                    <td>{{ u.email }}</td>
                    <td>{{ u.createdAt | date: 'd MMM y' }}</td>
                    <td>{{ u.lastLoginAt ? (u.lastLoginAt | date: 'd MMM y') : '—' }}</td>
                    <td>
                      <span class="pill" [class.pill-success]="u.isActive" [class.pill-muted]="!u.isActive">{{ u.isActive ? 'Active' : 'Blocked' }}</span>
                      @if (u.isVerified) { <span class="pill pill-success">Verified</span> }
                    </td>
                    <td class="nowrap">
                      <button class="btn btn-ghost btn-sm" (click)="toggleVerified(u)">{{ u.isVerified ? 'Unverify' : 'Verify' }}</button>
                      <button class="btn btn-ghost btn-sm" (click)="toggleActive(u)">{{ u.isActive ? 'Block' : 'Unblock' }}</button>
                      <select class="grant-select" (change)="grant(u, $any($event.target))" [attr.aria-label]="'Give ' + u.fullName + ' a plan'">
                        <option value="">Give plan…</option>
                        <option value="Gold">Gold (free)</option>
                        <option value="Platinum">Platinum (free)</option>
                      </select>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
          @if (pages() > 1) {
            <div class="pager">
              <button class="btn btn-ghost btn-sm" [disabled]="page() === 1" (click)="load(page() - 1)">‹ Prev</button>
              <span>Page {{ page() }} of {{ pages() }}</span>
              <button class="btn btn-ghost btn-sm" [disabled]="page() === pages()" (click)="load(page() + 1)">Next ›</button>
            </div>
          }
        </div>
      } @else if (tab() === 'payments') {
        <div class="card">
          <div class="row gap">
            <label class="inline-label">Show
              <select [(ngModel)]="paymentStatus" name="paymentStatus" (ngModelChange)="loadPayments()">
                <option value="Paid">Paid</option>
                <option value="Created">Started, not paid</option>
                <option value="Failed">Cancelled / failed</option>
                <option value="All">All</option>
              </select>
            </label>
          </div>
          @if (payments().length === 0) { <div class="empty">No payments here.</div> }
          @else {
            <div class="table-wrap">
              <table>
                <thead><tr><th>Date</th><th>Member</th><th>Plan</th><th>Amount</th><th>Via</th><th>Invoice</th></tr></thead>
                <tbody>
                  @for (o of payments(); track o.id) {
                    <tr>
                      <td>{{ (o.paidAt ?? o.createdAt) | date: 'd MMM y, h:mm a' }}</td>
                      <td><a [routerLink]="['/profile', o.userId]">{{ o.fullName }}</a><br /><span class="muted small">{{ o.email }}</span></td>
                      <td>{{ o.planCode }}</td>
                      <td>₹{{ o.amount / 100 | number }}</td>
                      <td>{{ o.provider === 'Admin' ? 'Complimentary' : o.provider }}</td>
                      <td>@if (o.invoiceNumber) { <a [routerLink]="['/invoice', o.id]">{{ o.invoiceNumber }}</a> } @else { — }</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        </div>
      } @else if (tab() === 'stories') {
        <div class="card">
          <div class="row gap">
            <label class="inline-label">Show
              <select [(ngModel)]="storyStatus" name="storyStatus" (ngModelChange)="loadStories()">
                <option value="Pending">Waiting for review</option>
                <option value="Approved">Published</option>
                <option value="Declined">Not published</option>
              </select>
            </label>
          </div>
          @if (storiesList().length === 0) { <div class="empty">Nothing here.</div> }
          @for (s of storiesList(); track s.id) {
            <div class="report-item">
              <div class="row gap"><b class="grow">{{ s.title }}</b><span class="muted small">{{ s.createdAt | date: 'd MMM y' }}</span></div>
              <p class="muted small">{{ s.coupleNames }}{{ s.city ? ' · ' + s.city : '' }}</p>
              <p class="pre">{{ s.story }}</p>
              @if (s.status === 'Pending') {
                <div class="row gap">
                  <button class="btn btn-ghost btn-sm" (click)="reviewStory(s.id, false)">Don't publish</button>
                  <button class="btn btn-primary btn-sm" (click)="reviewStory(s.id, true)">Publish</button>
                </div>
              } @else if (s.status === 'Approved') {
                <button class="btn btn-ghost btn-sm" (click)="reviewStory(s.id, false)">Unpublish</button>
              }
            </div>
          }
        </div>
      } @else if (tab() === 'outbox') {
        <div class="card">
          <div class="row gap">
            <p class="muted small grow">Local development only: emails and SMS that would have been sent if a provider were set up.
              Use them to test codes and links.</p>
            <button class="btn btn-ghost btn-sm" (click)="loadOutbox()">Refresh</button>
            <button class="btn btn-ghost btn-sm" (click)="clearOutbox()">Clear</button>
          </div>
          @if (outboxError()) { <div class="empty">{{ outboxError() }}</div> }
          @else if (outbox().length === 0) { <div class="empty">The outbox is empty.</div> }
          @for (m of outbox(); track m.id) {
            <div class="report-item">
              <div class="row gap">
                <b class="grow"><span class="pill">{{ m.channel }}</span> {{ m.to }}</b>
                <span class="muted small">{{ m.createdAt | date: 'd MMM, h:mm:ss a' }}</span>
              </div>
              @if (m.subject) { <b class="small">{{ m.subject }}</b> }
              <p class="pre small outbox-body">{{ m.body }}</p>
            </div>
          }
        </div>
      } @else if (tab() === 'verifications') {
        <div class="card">
          <div class="row gap">
            <label class="inline-label">Show
              <select [(ngModel)]="verificationStatus" name="verificationStatus" (ngModelChange)="loadVerifications()">
                <option value="Pending">Waiting for review</option>
                <option value="Approved">Approved</option>
                <option value="Declined">Rejected</option>
                <option value="All">All</option>
              </select>
            </label>
          </div>
          <p class="muted small">Check that the name and date of birth on the document match the profile. Documents are deleted after review.</p>
          @if (verifications().length === 0) { <div class="empty">Nothing here.</div> }
          @for (v of verifications(); track v.id) {
            <div class="report-item">
              <div class="row gap">
                <b class="grow"><a [routerLink]="['/profile', v.userId]">{{ v.fullName }}</a> <span class="pill">{{ v.documentType }}</span></b>
                <span class="muted small">{{ v.createdAt | date: 'd MMM y, h:mm a' }}</span>
              </div>
              <p class="muted small">{{ v.email }} · Date of birth on profile: <b>{{ v.dateOfBirth | date: 'd MMM y' }}</b></p>
              @if (v.status === 'Pending') {
                <div class="row gap">
                  <button class="btn btn-outline btn-sm" (click)="viewDocument(v)">View document</button>
                </div>
                @if (preview()?.id === v.id) {
                  @if (preview()!.isImage) {
                    <img class="doc-preview" [src]="preview()!.url" alt="ID document" />
                  } @else {
                    <p class="small">PDF opened in a new tab. <a [href]="preview()!.url" target="_blank" rel="noopener">Open again</a></p>
                  }
                }
                <div class="row gap">
                  <input class="grow" placeholder="Reason (required to reject)" [(ngModel)]="notes[v.id]" [name]="'vnote' + v.id" />
                  <button class="btn btn-ghost btn-sm" (click)="review(v, false)">Reject</button>
                  <button class="btn btn-primary btn-sm" (click)="review(v, true)">Approve ✔</button>
                </div>
              } @else {
                <p class="small"><span class="pill" [class.pill-success]="v.status === 'Approved'">{{ v.status === 'Approved' ? 'Approved' : 'Rejected' }}</span>
                  {{ v.adminNote }}</p>
              }
            </div>
          }
        </div>
      } @else {
        <div class="card">
          <div class="row gap">
            <label class="inline-label">Show
              <select [(ngModel)]="reportStatus" name="reportStatus" (ngModelChange)="loadReports()">
                <option value="Open">Open</option>
                <option value="ActionTaken">Action taken</option>
                <option value="Dismissed">Dismissed</option>
                <option value="All">All</option>
              </select>
            </label>
          </div>
          @if (reports().length === 0) { <div class="empty">No reports here.</div> }
          @for (r of reports(); track r.id) {
            <div class="report-item">
              <div class="row gap">
                <b class="grow">
                  <a [routerLink]="['/profile', r.reportedId]">{{ r.reportedName }}</a>
                  <span class="pill">{{ r.reason }}</span>
                  @if (r.reportsAgainstUser > 1) { <span class="pill pill-danger">{{ r.reportsAgainstUser }} reports</span> }
                  @if (!r.reportedIsActive) { <span class="pill pill-muted">Blocked</span> }
                </b>
                <span class="muted small">{{ r.createdAt | date: 'd MMM y, h:mm a' }}</span>
              </div>
              <p class="muted small">Reported by {{ r.reporterName }}</p>
              @if (r.details) { <p class="pre">{{ r.details }}</p> }
              @if (r.status === 'Open') {
                <div class="row gap">
                  <input class="grow" placeholder="Note (optional)" [(ngModel)]="notes[r.id]" [name]="'note' + r.id" />
                  <button class="btn btn-ghost btn-sm" (click)="resolve(r, false)">Dismiss</button>
                  <button class="btn btn-primary btn-sm" (click)="resolve(r, true)">Block member</button>
                </div>
              } @else {
                <p class="small"><span class="pill" [class.pill-success]="r.status === 'ActionTaken'">{{ r.status === 'ActionTaken' ? 'Member blocked' : 'Dismissed' }}</span>
                  {{ r.adminNote }}</p>
              }
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class AdminPage {
  private api = inject(ApiService);
  tab = signal<'members' | 'reports' | 'verifications' | 'payments' | 'stories' | 'outbox'>('members');
  payments = signal<AdminOrder[]>([]);
  paymentStatus = 'Paid';
  storiesList = signal<Story[]>([]);
  storyStatus = 'Pending';
  outbox = signal<OutboxMessage[]>([]);
  outboxError = signal('');
  notice = signal('');
  verifications = signal<AdminVerification[]>([]);
  verificationStatus = 'Pending';
  preview = signal<{ id: number; url: string; isImage: boolean } | null>(null);
  stats = signal<AdminStats | null>(null);
  users = signal<AdminUser[]>([]);
  reports = signal<AdminReport[]>([]);
  error = signal('');
  page = signal(1);
  pages = signal(1);
  q = '';
  reportStatus = 'Open';
  notes: Record<number, string> = {};

  constructor() {
    this.refreshStats();
    this.load(1);
  }

  load(page: number) {
    this.api.adminUsers(this.q, page).subscribe((r) => {
      this.users.set(r.items);
      this.page.set(r.page);
      this.pages.set(Math.max(1, Math.ceil(r.total / r.pageSize)));
    });
  }

  showPayments() { this.tab.set('payments'); this.loadPayments(); }
  loadPayments() { this.api.adminPayments(this.paymentStatus).subscribe((r) => this.payments.set(r)); }

  showStories() { this.tab.set('stories'); this.loadStories(); }
  loadStories() { this.api.adminStories(this.storyStatus).subscribe((r) => this.storiesList.set(r)); }
  reviewStory(id: number, approve: boolean) {
    this.api.adminReviewStory(id, approve).subscribe({
      next: () => { this.loadStories(); this.refreshStats(); },
      error: (e) => this.error.set(errorMessage(e)),
    });
  }

  showOutbox() { this.tab.set('outbox'); this.loadOutbox(); }
  loadOutbox() {
    this.outboxError.set('');
    this.api.adminOutbox().subscribe({
      next: (r) => this.outbox.set(r),
      error: (e) => this.outboxError.set(e.status === 404 ? 'The Dev outbox is only available when the API runs in Development.' : errorMessage(e)),
    });
  }
  clearOutbox() { this.api.adminClearOutbox().subscribe(() => this.outbox.set([])); }

  grant(u: AdminUser, select: HTMLSelectElement) {
    const plan = select.value;
    select.value = '';
    if (!plan || !confirm(`Give ${u.fullName} a free ${plan} plan?`)) return;
    this.api.adminGrantPlan(u.id, plan, 'Admin grant').subscribe({
      next: () => { this.notice.set(`${u.fullName} now has ${plan}.`); this.refreshStats(); },
      error: (e) => this.error.set(errorMessage(e)),
    });
  }

  showVerifications() {
    this.tab.set('verifications');
    this.loadVerifications();
  }

  loadVerifications() {
    this.api.adminVerifications(this.verificationStatus).subscribe((r) => this.verifications.set(r));
  }

  viewDocument(v: AdminVerification) {
    this.clearPreview();
    this.api.adminVerificationDocument(v.id).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const isImage = blob.type.startsWith('image/');
        this.preview.set({ id: v.id, url, isImage });
        if (!isImage) window.open(url, '_blank', 'noopener');
      },
      error: (e) => this.error.set(errorMessage(e)),
    });
  }

  review(v: AdminVerification, approve: boolean) {
    const note = (this.notes[v.id] ?? '').trim();
    if (!approve && !note) { this.error.set('Add a reason so the member knows what to fix.'); return; }
    this.error.set('');
    this.api.adminReviewVerification(v.id, approve, note).subscribe({
      next: () => { this.clearPreview(); this.loadVerifications(); this.refreshStats(); this.load(this.page()); },
      error: (e) => this.error.set(errorMessage(e)),
    });
  }

  private clearPreview() {
    const p = this.preview();
    if (p) URL.revokeObjectURL(p.url);
    this.preview.set(null);
  }

  showReports() {
    this.tab.set('reports');
    this.loadReports();
  }

  loadReports() {
    this.api.adminReports(this.reportStatus).subscribe((r) => this.reports.set(r));
  }

  resolve(r: AdminReport, blockUser: boolean) {
    if (blockUser && !confirm(`Block ${r.reportedName}? They won't be able to log in.`)) return;
    this.api.adminResolveReport(r.id, blockUser, this.notes[r.id] ?? '').subscribe({
      next: () => { this.loadReports(); this.refreshStats(); this.load(this.page()); },
      error: (e) => this.error.set(errorMessage(e)),
    });
  }

  toggleActive(u: AdminUser) {
    this.api.adminToggleActive(u.id).subscribe(() => this.patch(u.id, { isActive: !u.isActive }));
  }

  toggleVerified(u: AdminUser) {
    this.api.adminToggleVerified(u.id).subscribe(() => this.patch(u.id, { isVerified: !u.isVerified }));
  }

  private refreshStats() {
    this.api.adminStats().subscribe((s) => this.stats.set(s));
  }

  private patch(id: number, change: Partial<AdminUser>) {
    this.users.update((l) => l.map((x) => (x.id === id ? { ...x, ...change } : x)));
    this.refreshStats();
  }
}

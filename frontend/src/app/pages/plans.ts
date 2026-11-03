import { Component, inject, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { ApiService, errorMessage } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { CheckoutService } from '../core/checkout.service';
import { Checkout, MyPlan, Plan, PlansResponse } from '../core/models';

@Component({
  selector: 'app-plans',
  imports: [RouterLink, DatePipe, DecimalPipe],
  template: `
    <div class="container page">
      <h1>Membership plans</h1>
      <p class="muted">Upgrade to reach more people and contact them directly.</p>

      @if (success()) { <div class="alert alert-success">🎉 {{ success() }}</div> }
      @if (error()) { <div class="alert alert-error">{{ error() }}</div> }
      @if (data()?.paymentMode === 'Demo') {
        <div class="alert alert-info small">🧪 <b>Demo payments are on.</b> This is a local test setup: no real money is charged.
          Add Razorpay test keys in the API settings to use real checkout.</div>
      }
      @if (data()?.paymentMode === 'None') {
        <div class="alert alert-info small">Online payments aren't set up yet. Please check back soon.</div>
      }

      @if (mine(); as m) {
        <div class="card current-plan">
          <div class="row gap">
            <b class="grow">Your plan: <span class="plan-name" [class]="'plan-' + m.plan.code.toLowerCase()">{{ m.plan.name }}</span>
              @if (m.endsAt) { <span class="muted small">· until {{ m.endsAt | date: 'd MMM y' }}</span> }</b>
            <a routerLink="/billing" class="muted small">Billing history →</a>
          </div>
          <div class="usage">
            <div>
              <span class="muted small">Interests sent today</span>
              <b>{{ m.interestsToday }} / {{ m.interestsPerDay ?? '∞' }}</b>
            </div>
            <div>
              <span class="muted small">Contact views left</span>
              <b>{{ m.contactViewsLeft }}{{ m.contactViewsTotal ? ' / ' + m.contactViewsTotal : '' }}</b>
            </div>
          </div>
        </div>
      }

      <div class="plan-grid">
        @for (p of data()?.plans ?? []; track p.code) {
          <div class="card plan-card" [class.featured]="p.code === 'Platinum'" [class.current]="mine()?.plan?.code === p.code">
            @if (p.code === 'Platinum') { <span class="plan-ribbon">Best value</span> }
            <h2>{{ p.name }}</h2>
            <div class="price">
              @if (p.priceInr === 0) { <b>Free</b> }
              @else { <b>₹{{ p.priceInr | number }}</b> <span class="muted">/ {{ p.months }} months</span> }
            </div>
            @if (p.priceInr > 0) { <p class="muted small">≈ ₹{{ p.priceInr / p.months | number: '1.0-0' }} a month</p> }
            <ul class="plan-features">
              @for (h of p.highlights; track h) { <li>✔ {{ h }}</li> }
            </ul>
            @if (p.priceInr > 0) {
              <button class="btn btn-block" [class.btn-primary]="p.code === 'Platinum'" [class.btn-outline]="p.code !== 'Platinum'"
                [disabled]="busy() || data()?.paymentMode === 'None'" (click)="buy(p)">
                {{ mine()?.plan?.code === p.code ? 'Renew ' + p.name : 'Get ' + p.name }}
              </button>
            } @else if (!auth.isLoggedIn()) {
              <a routerLink="/register" class="btn btn-ghost btn-block">Register free</a>
            }
          </div>
        }
      </div>

      <p class="muted small center">Prices include taxes. Buying the same plan again adds time to it; switching plans starts the new one
        today. Unused contact views carry over.</p>
    </div>

    @if (demo(); as c) {
      <div class="modal-backdrop" (click)="cancelDemo()">
        <div class="modal card" (click)="$event.stopPropagation()" role="dialog" aria-modal="true" aria-labelledby="demo-title">
          <h2 id="demo-title">Demo checkout</h2>
          <p>You're buying the <b>{{ c.planName }}</b> plan for <b>₹{{ c.amount / 100 | number }}</b>.</p>
          <div class="alert alert-info small">🧪 Demo mode – no card is needed and no money is charged. With Razorpay keys set up,
            the real Razorpay checkout opens here instead.</div>
          <div class="row gap">
            <button class="btn btn-primary" [disabled]="busy()" (click)="confirmDemo(c)">{{ busy() ? 'Processing…' : 'Pay (demo)' }}</button>
            <button class="btn btn-ghost" [disabled]="busy()" (click)="cancelDemo()">Cancel</button>
          </div>
        </div>
      </div>
    }
  `,
})
export class PlansPage {
  auth = inject(AuthService);
  private api = inject(ApiService);
  private checkout = inject(CheckoutService);
  private router = inject(Router);

  data = signal<PlansResponse | null>(null);
  mine = signal<MyPlan | null>(null);
  demo = signal<Checkout | null>(null);
  busy = signal(false);
  error = signal('');
  success = signal('');

  constructor() {
    this.api.plans().subscribe((d) => this.data.set(d));
    if (this.auth.isLoggedIn() && !this.auth.isAdmin()) this.api.myPlan().subscribe((m) => this.mine.set(m));
  }

  async buy(p: Plan) {
    if (!this.auth.isLoggedIn()) { this.router.navigate(['/login']); return; }
    this.error.set('');
    this.success.set('');
    this.busy.set(true);
    try {
      const c = await this.checkout.start(p.code);
      if (c.provider === 'Demo') { this.demo.set(c); return; }
      const result = await this.checkout.payWithRazorpay(c);
      if (result) this.done(result);
    } catch (e: any) {
      this.error.set(e?.error ? errorMessage(e) : e?.message ?? 'Payment failed.');
    } finally {
      this.busy.set(false);
    }
  }

  async confirmDemo(c: Checkout) {
    this.busy.set(true);
    try {
      this.done(await this.checkout.payDemo(c));
      this.demo.set(null);
    } catch (e) {
      this.error.set(errorMessage(e));
      this.demo.set(null);
    } finally {
      this.busy.set(false);
    }
  }

  cancelDemo() {
    const c = this.demo();
    if (c) this.checkout.cancel(c);
    this.demo.set(null);
  }

  private done(m: MyPlan) {
    this.mine.set(m);
    const until = m.endsAt
      ? ' until ' + new Date(m.endsAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
      : '';
    this.success.set(`Payment received. Your ${m.plan.name} plan is active${until}.`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

import { Component, OnChanges, inject, input, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService, errorMessage } from '../core/api.service';
import { Invoice, Order } from '../core/models';

@Component({
  selector: 'app-billing',
  imports: [RouterLink, DatePipe, DecimalPipe],
  template: `
    <div class="container page narrow">
      <div class="section-head">
        <h1>Billing history</h1>
        <a routerLink="/plans" class="muted">Plans →</a>
      </div>
      @if (loaded() && orders().length === 0) {
        <div class="empty">No payments yet. <a routerLink="/plans">See plans</a></div>
      }
      @if (orders().length) {
        <div class="card table-wrap">
          <table>
            <thead><tr><th>Date</th><th>Plan</th><th>Amount</th><th>Invoice</th></tr></thead>
            <tbody>
              @for (o of orders(); track o.id) {
                <tr>
                  <td>{{ (o.paidAt ?? o.createdAt) | date: 'd MMM y' }}</td>
                  <td>{{ o.planName }} @if (o.provider === 'Demo') { <span class="pill">demo</span> }
                    @if (o.provider === 'Admin') { <span class="pill">complimentary</span> }</td>
                  <td>₹{{ o.amount / 100 | number }}</td>
                  <td><a [routerLink]="['/invoice', o.id]">{{ o.invoiceNumber }}</a></td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </div>
  `,
})
export class BillingPage {
  private api = inject(ApiService);
  orders = signal<Order[]>([]);
  loaded = signal(false);

  constructor() {
    this.api.myOrders().subscribe((o) => { this.orders.set(o); this.loaded.set(true); });
  }
}

@Component({
  selector: 'app-invoice',
  imports: [DatePipe, DecimalPipe, RouterLink],
  template: `
    <div class="container page narrow">
      <div class="row gap no-print">
        <a routerLink="/billing" class="muted grow">‹ Billing history</a>
        <button class="btn btn-outline btn-sm" (click)="print()">🖨 Print / save as PDF</button>
      </div>
      @if (error()) { <div class="alert alert-error">{{ error() }}</div> }
      @if (inv(); as i) {
        <div class="card invoice">
          <div class="row gap invoice-head">
            <div class="grow">
              <div class="brand"><span class="brand-mark">♥</span> {{ i.sellerName }}</div>
              @if (i.sellerAddress) { <p class="muted small pre">{{ i.sellerAddress }}</p> }
            </div>
            <div class="right">
              <h2>Invoice</h2>
              <p class="small">No. <b>{{ i.order.invoiceNumber }}</b></p>
              <p class="small">Date: {{ i.order.paidAt | date: 'd MMM y' }}</p>
            </div>
          </div>
          <div class="invoice-to">
            <span class="muted small">Billed to</span>
            <b>{{ i.billedTo }}</b>
            <span class="small">{{ i.email }}{{ i.phone ? ' · ' + i.phone : '' }}</span>
          </div>
          <table>
            <thead><tr><th>Description</th><th>Period</th><th class="right">Amount</th></tr></thead>
            <tbody>
              <tr>
                <td>{{ i.order.planName }} membership</td>
                <td>{{ i.planStarts | date: 'd MMM y' }} – {{ i.planEnds | date: 'd MMM y' }}</td>
                <td class="right">₹{{ i.order.amount / 100 | number: '1.2-2' }}</td>
              </tr>
            </tbody>
            <tfoot><tr><th colspan="2">Total paid</th><th class="right">₹{{ i.order.amount / 100 | number: '1.2-2' }}</th></tr></tfoot>
          </table>
          <p class="muted small">Payment reference: {{ i.order.providerPaymentId || '—' }} ({{ i.order.provider }})</p>
          @if (i.order.provider === 'Demo') { <p class="alert alert-info small">This is a demo payment made in test mode. No money was charged.</p> }
        </div>
      }
    </div>
  `,
})
export class InvoicePage implements OnChanges {
  private api = inject(ApiService);
  id = input.required<string>();
  inv = signal<Invoice | null>(null);
  error = signal('');

  ngOnChanges() {
    this.api.invoice(+this.id()).subscribe({
      next: (i) => this.inv.set(i),
      error: (e) => this.error.set(e.status === 404 ? 'Invoice not found.' : errorMessage(e)),
    });
  }

  print() {
    window.print();
  }
}

import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApiService } from './api.service';
import { Checkout, MyPlan } from './models';

declare global {
  interface Window { Razorpay?: any; }
}

const RAZORPAY_SCRIPT = 'https://checkout.razorpay.com/v1/checkout.js';

/**
 * Runs a plan purchase. With Razorpay it opens Razorpay Checkout and sends the signed result to the API.
 * In Demo mode the page shows its own "pretend payment" dialog and calls payDemo() instead.
 */
@Injectable({ providedIn: 'root' })
export class CheckoutService {
  private api = inject(ApiService);
  private scriptLoading: Promise<void> | null = null;

  start(planCode: string): Promise<Checkout> {
    return firstValueFrom(this.api.createOrder(planCode));
  }

  payDemo(c: Checkout): Promise<MyPlan> {
    return firstValueFrom(this.api.verifyPayment({ orderId: c.orderId, demo: true }));
  }

  cancel(c: Checkout) {
    this.api.cancelOrder(c.orderId).subscribe();
  }

  /** Opens Razorpay Checkout. Resolves with the new plan, or null if the member closed the window. */
  async payWithRazorpay(c: Checkout): Promise<MyPlan | null> {
    await this.loadScript();
    return new Promise<MyPlan | null>((resolve, reject) => {
      const rzp = new window.Razorpay({
        key: c.keyId,
        order_id: c.providerOrderId,
        amount: c.amount,
        currency: c.currency,
        name: 'Vivaha Matrimony',
        description: `${c.planName} plan`,
        prefill: { name: c.name, email: c.email, contact: c.phone ?? '' },
        theme: { color: '#b3264a' },
        handler: (res: { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string }) => {
          this.api.verifyPayment({
            orderId: c.orderId,
            razorpayOrderId: res.razorpay_order_id,
            razorpayPaymentId: res.razorpay_payment_id,
            razorpaySignature: res.razorpay_signature,
          }).subscribe({ next: resolve, error: reject });
        },
        modal: { ondismiss: () => { this.cancel(c); resolve(null); } },
      });
      rzp.on('payment.failed', (e: any) => reject(new Error(e?.error?.description ?? 'Payment failed')));
      rzp.open();
    });
  }

  private loadScript(): Promise<void> {
    if (window.Razorpay) return Promise.resolve();
    this.scriptLoading ??= new Promise<void>((resolve, reject) => {
      const s = document.createElement('script');
      s.src = RAZORPAY_SCRIPT;
      s.onload = () => resolve();
      s.onerror = () => { this.scriptLoading = null; reject(new Error('Could not load Razorpay. Check your internet connection.')); };
      document.head.appendChild(s);
    });
    return this.scriptLoading;
  }
}

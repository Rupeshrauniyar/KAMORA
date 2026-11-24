import 'server-only';
import Stripe from 'stripe';

export interface CreateCheckoutSessionInput {
  orderId: string;
  orderNumber: string;
  customerEmail: string;
  customerName: string;
  customerPhone: string;
  amountPaise: number;
  lineItems: {
    name: string;
    description?: string;
    unitAmountPaise: number;
    quantity: number;
  }[];
  shippingPaise: number;
  discountPaise: number;
  successUrl: string;
  cancelUrl: string;
  preferredMethod?: 'stripe_card' | 'stripe_upi';
}

export interface CreateCheckoutSessionResult {
  provider: 'stripe';
  sessionId: string;
  checkoutUrl: string;
  paymentIntentId: string | null;
}

export interface RefundPaymentInput {
  paymentIntentId: string;
  amountPaise?: number;
  reason?: 'duplicate' | 'fraudulent' | 'requested_by_customer';
  idempotencyKey: string;
}

export interface RefundPaymentResult {
  providerRefundId: string;
  status: string;
  amountPaise: number;
}

/**
 * Payment Provider Abstraction so India domestic gateways (e.g., Razorpay / Cashfree)
 * can be plugged in cleanly if Stripe India merchant account lacks domestic UPI eligibility.
 */
export interface PaymentProvider {
  readonly name: string;
  isConfigured(): boolean;
  getEnabledMethods(): ('card' | 'upi')[];
  createCheckoutSession(
    input: CreateCheckoutSessionInput
  ): Promise<CreateCheckoutSessionResult>;
  createRefund(input: RefundPaymentInput): Promise<RefundPaymentResult>;
}

let stripeClientSingleton: Stripe | null = null;

export function getStripeClient(): Stripe {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey || secretKey.includes('your_secret_key')) {
    throw new Error(
      'Stripe is not configured. Set STRIPE_SECRET_KEY in your environment variables.'
    );
  }
  if (!stripeClientSingleton) {
    stripeClientSingleton = new Stripe(secretKey, {
      typescript: true,
    });
  }
  return stripeClientSingleton;
}

export function getConfiguredStripeMethods(): ('card' | 'upi')[] {
  const raw = (process.env.STRIPE_ENABLED_PAYMENT_METHODS || 'card')
    .split(',')
    .map((m) => m.trim().toLowerCase());

  const allowed: ('card' | 'upi')[] = [];
  if (raw.includes('card')) allowed.push('card');
  // Only expose UPI if explicitly enabled after Stripe India merchant approval
  if (raw.includes('upi')) allowed.push('upi');
  return allowed.length > 0 ? allowed : ['card'];
}

export function isStripeConfigured(): boolean {
  return Boolean(
    process.env.STRIPE_SECRET_KEY &&
      !process.env.STRIPE_SECRET_KEY.includes('your_secret_key') &&
      process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY &&
      !process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY.includes('your_publishable_key')
  );
}

export class StripePaymentProvider implements PaymentProvider {
  readonly name = 'stripe';

  isConfigured(): boolean {
    return isStripeConfigured();
  }

  getEnabledMethods(): ('card' | 'upi')[] {
    return getConfiguredStripeMethods();
  }

  async createCheckoutSession(
    input: CreateCheckoutSessionInput
  ): Promise<CreateCheckoutSessionResult> {
    const stripe = getStripeClient();
    const enabledMethods = this.getEnabledMethods();

    const rawTypes: string[] =
      input.preferredMethod === 'stripe_upi' && enabledMethods.includes('upi')
        ? ['upi', 'card']
        : enabledMethods;
    const paymentMethodTypes =
      rawTypes as unknown as Stripe.Checkout.SessionCreateParams.PaymentMethodType[];

    // Pass authoritative server-calculated final payable amount in integer paise (INR)
    const session = await stripe.checkout.sessions.create(
      {
        mode: 'payment',
        currency: 'inr',
        payment_method_types: paymentMethodTypes,
        customer_email: input.customerEmail,
        client_reference_id: input.orderId,
        metadata: {
          order_id: input.orderId,
          order_number: input.orderNumber,
          customer_phone: input.customerPhone,
        },
        payment_intent_data: {
          metadata: {
            order_id: input.orderId,
            order_number: input.orderNumber,
          },
        },
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: 'inr',
              unit_amount: input.amountPaise,
              product_data: {
                name: `Kamora Order ${input.orderNumber}`,
                description: input.lineItems
                  .map((item) => `${item.name} × ${item.quantity}`)
                  .join(', '),
              },
            },
          },
        ],
        success_url: input.successUrl,
        cancel_url: input.cancelUrl,
      },
      {
        idempotencyKey: `checkout_session_${input.orderId}`,
      }
    );

    if (!session.url) {
      throw new Error('Stripe did not return a hosted checkout URL.');
    }

    return {
      provider: 'stripe',
      sessionId: session.id,
      checkoutUrl: session.url,
      paymentIntentId:
        typeof session.payment_intent === 'string'
          ? session.payment_intent
          : session.payment_intent?.id ?? null,
    };
  }

  async createRefund(input: RefundPaymentInput): Promise<RefundPaymentResult> {
    const stripe = getStripeClient();
    const refund = await stripe.refunds.create(
      {
        payment_intent: input.paymentIntentId,
        amount: input.amountPaise,
        reason: input.reason ?? 'requested_by_customer',
      },
      {
        idempotencyKey: input.idempotencyKey,
      }
    );

    return {
      providerRefundId: refund.id,
      status: refund.status ?? 'pending',
      amountPaise: refund.amount,
    };
  }
}

export function getActivePaymentProvider(): PaymentProvider {
  // Future Indian providers (razorpay / cashfree) can be instantiated here
  // based on process.env.PAYMENT_PROVIDER without altering checkout routes.
  return new StripePaymentProvider();
}

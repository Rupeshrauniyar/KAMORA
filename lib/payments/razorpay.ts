import 'server-only';
import crypto from 'crypto';

const RAZORPAY_API_BASE = 'https://api.razorpay.com/v1';

export interface RazorpayOrderResponse {
  id: string;
  entity: string;
  amount: number;
  amount_paid: number;
  amount_due: number;
  currency: string;
  receipt: string;
  status: string;
}

export interface RazorpayPaymentResponse {
  id: string;
  amount: number;
  currency: string;
  status: 'created' | 'authorized' | 'captured' | 'refunded' | 'failed';
  order_id: string;
  method: string;
  captured: boolean;
  email?: string;
  contact?: string;
  error_description?: string | null;
}

export interface RazorpayRefundResponse {
  id: string;
  amount: number;
  currency: string;
  payment_id: string;
  status: string;
}

export function isRazorpayConfigured(): boolean {
  const keyId = process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  return Boolean(
    keyId &&
      keySecret &&
      !keyId.includes('your_key_id') &&
      !keySecret.includes('your_razorpay')
  );
}

export function getRazorpayKeyId(): string {
  const keyId = process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
  if (!keyId) throw new Error('RAZORPAY_KEY_ID is not configured.');
  return keyId;
}

function getRazorpayAuthHeader(): string {
  const keyId = getRazorpayKeyId();
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keySecret) throw new Error('RAZORPAY_KEY_SECRET is not configured.');
  const token = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
  return `Basic ${token}`;
}

export async function createRazorpayOrder(params: {
  amountPaise: number;
  receipt: string;
  notes?: Record<string, string>;
}): Promise<RazorpayOrderResponse> {
  const res = await fetch(`${RAZORPAY_API_BASE}/orders`, {
    method: 'POST',
    headers: {
      Authorization: getRazorpayAuthHeader(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amount: Math.round(params.amountPaise),
      currency: 'INR',
      receipt: params.receipt.slice(0, 40),
      payment_capture: 1,
      notes: params.notes ?? {},
    }),
  });

  const data = (await res.json()) as RazorpayOrderResponse & {
    error?: { description?: string; code?: string };
  };

  if (!res.ok) {
    throw new Error(
      data.error?.description ?? `Razorpay order creation failed (${res.status}).`
    );
  }

  return data;
}

export async function fetchRazorpayPayment(
  paymentId: string
): Promise<RazorpayPaymentResponse> {
  const res = await fetch(`${RAZORPAY_API_BASE}/payments/${encodeURIComponent(paymentId)}`, {
    headers: {
      Authorization: getRazorpayAuthHeader(),
    },
    cache: 'no-store',
  });

  const data = (await res.json()) as RazorpayPaymentResponse & {
    error?: { description?: string };
  };

  if (!res.ok) {
    throw new Error(
      data.error?.description ?? `Unable to fetch Razorpay payment (${res.status}).`
    );
  }

  return data;
}

export async function captureRazorpayPayment(
  paymentId: string,
  amountPaise: number
): Promise<RazorpayPaymentResponse> {
  const res = await fetch(
    `${RAZORPAY_API_BASE}/payments/${encodeURIComponent(paymentId)}/capture`,
    {
      method: 'POST',
      headers: {
        Authorization: getRazorpayAuthHeader(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: Math.round(amountPaise),
        currency: 'INR',
      }),
    }
  );

  const data = (await res.json()) as RazorpayPaymentResponse & {
    error?: { description?: string };
  };

  if (!res.ok) {
    throw new Error(data.error?.description ?? 'Unable to capture Razorpay payment.');
  }

  return data;
}

export async function createRazorpayRefund(params: {
  paymentId: string;
  amountPaise?: number;
  notes?: Record<string, string>;
}): Promise<RazorpayRefundResponse> {
  const res = await fetch(
    `${RAZORPAY_API_BASE}/payments/${encodeURIComponent(params.paymentId)}/refund`,
    {
      method: 'POST',
      headers: {
        Authorization: getRazorpayAuthHeader(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...(params.amountPaise ? { amount: Math.round(params.amountPaise) } : {}),
        speed: 'normal',
        notes: params.notes ?? {},
      }),
    }
  );

  const data = (await res.json()) as RazorpayRefundResponse & {
    error?: { description?: string };
  };

  if (!res.ok) {
    throw new Error(data.error?.description ?? 'Razorpay refund request failed.');
  }

  return data;
}

/**
 * Cryptographically verifies the Razorpay Checkout signature returned to the browser.
 * HMAC-SHA256(razorpay_order_id + "|" + razorpay_payment_id, RAZORPAY_KEY_SECRET)
 */
export function verifyRazorpayPaymentSignature(params: {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}): boolean {
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) return false;

  const expected = crypto
    .createHmac('sha256', secret)
    .update(`${params.razorpayOrderId}|${params.razorpayPaymentId}`)
    .digest('hex');

  const expectedBuf = Buffer.from(expected, 'utf8');
  const receivedBuf = Buffer.from(params.razorpaySignature, 'utf8');

  if (expectedBuf.length !== receivedBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, receivedBuf);
}

/**
 * Cryptographically verifies X-Razorpay-Signature header on webhook payloads.
 */
export function verifyRazorpayWebhookSignature(
  rawBody: string,
  signature: string,
  webhookSecret: string
): boolean {
  const expected = crypto
    .createHmac('sha256', webhookSecret)
    .update(rawBody)
    .digest('hex');

  const expectedBuf = Buffer.from(expected, 'utf8');
  const receivedBuf = Buffer.from(signature, 'utf8');

  if (expectedBuf.length !== receivedBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, receivedBuf);
}

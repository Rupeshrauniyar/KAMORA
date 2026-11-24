import { describe, it, expect } from 'vitest';
import { checkoutFormSchema, indianPincodeSchema, indianPhoneSchema } from '@/lib/validation/schemas';

describe('Indian Commerce Validation Schemas', () => {
  it('accepts Unicode Indian names and valid +91 phone & 6-digit PIN codes', () => {
    const parsed = checkoutFormSchema.safeParse({
      full_name: 'अनन्या शर्मा',
      email: 'ananya@example.in',
      phone: '+91 98765 43210',
      address_line1: 'Flat 304, Breeze Apartments, 12th Main',
      city: 'Bengaluru',
      state: 'Karnataka',
      pincode: '560038',
      payment_method: 'stripe_card',
    });
    expect(parsed.success).toBe(true);
  });

  it('rejects invalid PIN codes and malformed mobile numbers', () => {
    expect(indianPincodeSchema.safeParse('056001').success).toBe(false);
    expect(indianPincodeSchema.safeParse('56003').success).toBe(false);
    expect(indianPhoneSchema.safeParse('1234567890').success).toBe(false);
    expect(indianPhoneSchema.safeParse('9876543210').success).toBe(true);
  });
});

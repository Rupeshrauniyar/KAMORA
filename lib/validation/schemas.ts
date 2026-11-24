import { z } from 'zod';

/**
 * Unicode-safe name pattern (allows Indian scripts, Latin, spaces, hyphens, periods).
 * Follows modern-web-guidance autofill-address-form best practice.
 */
const unicodeNameSchema = z
  .string()
  .trim()
  .min(2, 'Please enter your full name')
  .max(120, 'Name is too long')
  .refine((val) => /^[\p{L}\p{M}\s.'-]+$/u.test(val), {
    message: 'Name contains invalid characters',
  });

export const indianPhoneSchema = z
  .string()
  .trim()
  .transform((v) => v.replace(/[\s-]/g, ''))
  .refine(
    (v) => /^(\+91)?[6-9]\d{9}$/.test(v),
    'Enter a valid 10-digit Indian mobile number'
  );

export const indianPincodeSchema = z
  .string()
  .trim()
  .regex(/^[1-9][0-9]{5}$/, 'Enter a valid 6-digit Indian PIN code');

export const checkoutFormSchema = z.object({
  full_name: unicodeNameSchema,
  email: z
    .string()
    .trim()
    .email('Enter a valid email address')
    .optional()
    .or(z.literal('')),
  phone: indianPhoneSchema,
  address_line1: z
    .string()
    .trim()
    .min(5, 'Enter your delivery address (House/Flat, Street, Locality)')
    .max(240),
  address_line2: z.string().trim().max(200).optional(),
  landmark: z.string().trim().max(120).optional(),
  city: z.string().trim().min(2, 'Enter your city').max(80),
  state: z.string().trim().min(2, 'Select your state').max(80),
  pincode: indianPincodeSchema,
  payment_method: z.enum([
    'razorpay_upi',
    'razorpay_card',
    'stripe_card',
    'stripe_upi',
    'cod',
  ]),
  coupon_code: z.string().trim().max(40).optional(),
  customer_notes: z.string().trim().max(300).optional(),
  save_address: z.boolean().optional(),
});

export type CheckoutFormValues = z.infer<typeof checkoutFormSchema>;

export const cartMutationSchema = z.object({
  variant_id: z.string().uuid('Invalid product size'),
  quantity: z.number().int().min(1).max(20),
});

export const couponValidateSchema = z.object({
  code: z.string().trim().min(2).max(40).toUpperCase(),
  subtotal_paise: z.number().int().min(0),
});

export const reviewSubmitSchema = z.object({
  product_id: z.string().uuid(),
  author_name: unicodeNameSchema,
  author_city: z.string().trim().max(80).optional().default(''),
  rating: z.number().int().min(1).max(5),
  title: z.string().trim().min(3, 'Add a short headline').max(120),
  body: z
    .string()
    .trim()
    .min(15, 'Please share at least 15 characters about your experience')
    .max(1500),
});

export const newsletterSchema = z.object({
  email: z.string().trim().email('Enter a valid email address'),
  source: z.string().trim().max(40).optional().default('footer'),
});

export const contactFormSchema = z.object({
  name: unicodeNameSchema,
  email: z.string().trim().email('Enter a valid email address'),
  phone: z.string().trim().max(20).optional().default(''),
  order_number: z.string().trim().max(40).optional().default(''),
  message: z.string().trim().min(10, 'Please describe how we can help').max(2000),
});

export const trackOrderSchema = z.object({
  order_number: z
    .string()
    .trim()
    .min(5, 'Enter a valid order number (e.g. KMR-261124-123456)')
    .max(40),
  phone: indianPhoneSchema,
});

export const adminInventoryAdjustSchema = z.object({
  variant_id: z.string().uuid(),
  quantity_delta: z.number().int().refine((v) => v !== 0, 'Adjustment cannot be zero'),
  reason: z.string().trim().min(3, 'Provide a reason for the audit trail').max(240),
});

export const adminOrderUpdateSchema = z.object({
  order_id: z.string().uuid(),
  order_status: z.enum([
    'pending',
    'confirmed',
    'processing',
    'shipped',
    'out_for_delivery',
    'delivered',
    'cancelled',
    'returned',
  ]),
  internal_notes: z.string().max(1000).optional(),
  courier_name: z.string().max(100).optional(),
  tracking_number: z.string().max(100).optional(),
  tracking_url: z.string().url().optional().or(z.literal('')),
});

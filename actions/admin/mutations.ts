'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { requireAdminAction, writeAuditLog } from '@/lib/auth/admin';
import { getActivePaymentProvider } from '@/lib/payments/provider';
import { createRazorpayRefund, isRazorpayConfigured } from '@/lib/payments/razorpay';
import {
  adminInventoryAdjustSchema,
  adminOrderUpdateSchema,
} from '@/lib/validation/schemas';
import type { AdminRole } from '@/types/database';

function toPaise(rupeesInput: string | number): number {
  const num = typeof rupeesInput === 'number' ? rupeesInput : parseFloat(rupeesInput);
  if (!Number.isFinite(num) || num < 0) return 0;
  return Math.round(num * 100);
}

// -----------------------------------------------------------------------------
// PRODUCT & VARIANT MANAGEMENT
// -----------------------------------------------------------------------------
export async function updateProductAction(formData: FormData) {
  const actor = await requireAdminAction(['super_admin', 'admin', 'content_manager']);
  const admin = createAdminSupabaseClient();

  const productId = String(formData.get('product_id') ?? '');
  const name = String(formData.get('name') ?? '').trim();
  const subtitle = String(formData.get('subtitle') ?? '').trim();
  const shortDescription = String(formData.get('short_description') ?? '').trim();
  const description = String(formData.get('description') ?? '').trim();
  const mrpPaise = toPaise(String(formData.get('mrp_rupees') ?? '0'));
  const salePricePaise = toPaise(String(formData.get('sale_price_rupees') ?? '0'));
  const status = String(formData.get('status') ?? 'published');
  const seoTitle = String(formData.get('seo_title') ?? '').trim();
  const seoDescription = String(formData.get('seo_description') ?? '').trim();

  if (!productId || !name || salePricePaise <= 0 || mrpPaise < salePricePaise) {
    return { error: 'Invalid product details or MRP cannot be less than sale price.' };
  }

  const { error } = await admin
    .from('products')
    .update({
      name,
      subtitle: subtitle || null,
      short_description: shortDescription,
      description,
      mrp_paise: mrpPaise,
      sale_price_paise: salePricePaise,
      status,
      seo_title: seoTitle || null,
      seo_description: seoDescription || null,
    })
    .eq('id', productId);

  if (error) return { error: error.message };

  await writeAuditLog({
    actorUserId: actor.userId,
    actorRole: actor.role,
    action: 'product.updated',
    entityType: 'products',
    entityId: productId,
    afterState: { name, mrp_paise: mrpPaise, sale_price_paise: salePricePaise, status },
  });

  revalidatePath('/');
  revalidatePath('/products/back-support-belt');
  revalidatePath('/admin/products');
  return { ok: true };
}

export async function updateVariantPriceAction(formData: FormData) {
  const actor = await requireAdminAction(['super_admin', 'admin', 'inventory_manager']);
  const admin = createAdminSupabaseClient();

  const variantId = String(formData.get('variant_id') ?? '');
  const mrpPaise = toPaise(String(formData.get('mrp_rupees') ?? '0'));
  const salePricePaise = toPaise(String(formData.get('sale_price_rupees') ?? '0'));
  const isActive = formData.get('is_active') === 'on';

  if (!variantId || salePricePaise <= 0 || mrpPaise < salePricePaise) {
    return { error: 'Invalid variant pricing.' };
  }

  const { error } = await admin
    .from('product_variants')
    .update({ mrp_paise: mrpPaise, sale_price_paise: salePricePaise, is_active: isActive })
    .eq('id', variantId);

  if (error) return { error: error.message };

  await writeAuditLog({
    actorUserId: actor.userId,
    actorRole: actor.role,
    action: 'variant.updated',
    entityType: 'product_variants',
    entityId: variantId,
    afterState: { mrp_paise: mrpPaise, sale_price_paise: salePricePaise, is_active: isActive },
  });

  revalidatePath('/');
  revalidatePath('/products/back-support-belt');
  revalidatePath('/admin/products');
  return { ok: true };
}

// -----------------------------------------------------------------------------
// INVENTORY ADJUSTMENT
// -----------------------------------------------------------------------------
export async function adjustInventoryAction(formData: FormData) {
  const actor = await requireAdminAction(['super_admin', 'admin', 'inventory_manager']);
  const parsed = adminInventoryAdjustSchema.safeParse({
    variant_id: String(formData.get('variant_id') ?? ''),
    quantity_delta: parseInt(String(formData.get('quantity_delta') ?? '0'), 10),
    reason: String(formData.get('reason') ?? ''),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid stock adjustment.' };
  }

  const admin = createAdminSupabaseClient();
  const { data: current } = await admin
    .from('inventory')
    .select('*')
    .eq('variant_id', parsed.data.variant_id)
    .maybeSingle();

  if (!current) return { error: 'Inventory record not found.' };

  const nextStock = current.stock_on_hand + parsed.data.quantity_delta;
  if (nextStock < current.stock_reserved) {
    return {
      error: `Cannot reduce stock below reserved units (${current.stock_reserved}).`,
    };
  }

  const { error: updErr } = await admin
    .from('inventory')
    .update({ stock_on_hand: nextStock })
    .eq('id', current.id);

  if (updErr) return { error: updErr.message };

  await admin.from('inventory_movements').insert({
    variant_id: parsed.data.variant_id,
    movement_type: 'manual_adjustment',
    quantity_delta: parsed.data.quantity_delta,
    stock_before: current.stock_on_hand,
    stock_after: nextStock,
    reason: parsed.data.reason,
    performed_by: actor.userId,
  });

  await writeAuditLog({
    actorUserId: actor.userId,
    actorRole: actor.role,
    action: 'inventory.adjusted',
    entityType: 'inventory',
    entityId: parsed.data.variant_id,
    beforeState: { stock_on_hand: current.stock_on_hand },
    afterState: { stock_on_hand: nextStock, reason: parsed.data.reason },
  });

  revalidateTag('inventory');
  revalidateTag('products');
  revalidatePath('/products/back-support-belt');
  revalidatePath('/admin/inventory');
  revalidatePath('/admin');
  return { ok: true };
}

// -----------------------------------------------------------------------------
// ORDERS: STATUS, TRACKING, CANCELLATION (WITH STOCK RESTORE) & REFUNDS
// -----------------------------------------------------------------------------
export async function updateOrderAction(formData: FormData) {
  const actor = await requireAdminAction(['super_admin', 'admin', 'order_manager']);
  const parsed = adminOrderUpdateSchema.safeParse({
    order_id: String(formData.get('order_id') ?? ''),
    order_status: String(formData.get('order_status') ?? ''),
    internal_notes: String(formData.get('internal_notes') ?? ''),
    courier_name: String(formData.get('courier_name') ?? ''),
    tracking_number: String(formData.get('tracking_number') ?? ''),
    tracking_url: String(formData.get('tracking_url') ?? ''),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid order update.' };
  }

  const admin = createAdminSupabaseClient();
  const { data: existing } = await admin
    .from('orders')
    .select('id, order_status, inventory_deducted, items:order_items(variant_id, quantity)')
    .eq('id', parsed.data.order_id)
    .maybeSingle();

  if (!existing) return { error: 'Order not found.' };

  const updates: Record<string, unknown> = {
    order_status: parsed.data.order_status,
    internal_notes: parsed.data.internal_notes || null,
  };

  if (parsed.data.order_status === 'delivered') {
    updates.delivered_at = new Date().toISOString();
  }
  if (parsed.data.order_status === 'cancelled') {
    updates.cancelled_at = new Date().toISOString();
  }

  const { error } = await admin.from('orders').update(updates).eq('id', existing.id);
  if (error) return { error: error.message };

  // Restore inventory if cancelling/returning an order that already deducted stock
  const wasActive = !['cancelled', 'returned'].includes(existing.order_status);
  const nowCancelledOrReturned = ['cancelled', 'returned'].includes(parsed.data.order_status);

  if (wasActive && nowCancelledOrReturned && existing.inventory_deducted) {
    const items = (existing.items as { variant_id: string | null; quantity: number }[]) ?? [];
    for (const item of items) {
      if (item.variant_id) {
        await admin.rpc('restore_inventory_on_cancel', {
          p_variant_id: item.variant_id,
          p_quantity: item.quantity,
          p_order_id: existing.id,
          p_reason: `Admin marked order ${parsed.data.order_status}`,
          p_actor: actor.userId,
        });
      }
    }
    await admin.from('orders').update({ inventory_deducted: false }).eq('id', existing.id);
  }

  // Upsert shipment tracking if courier/tracking number provided
  if (parsed.data.courier_name || parsed.data.tracking_number) {
    const { data: existingShipment } = await admin
      .from('shipments')
      .select('id')
      .eq('order_id', existing.id)
      .maybeSingle();

    const shipmentPayload = {
      order_id: existing.id,
      courier_name: parsed.data.courier_name || null,
      tracking_number: parsed.data.tracking_number || null,
      tracking_url: parsed.data.tracking_url || null,
      shipment_status: parsed.data.order_status,
      ...(parsed.data.order_status === 'shipped'
        ? { dispatched_at: new Date().toISOString() }
        : {}),
      ...(parsed.data.order_status === 'delivered'
        ? { delivered_at: new Date().toISOString() }
        : {}),
    };

    if (existingShipment) {
      await admin.from('shipments').update(shipmentPayload).eq('id', existingShipment.id);
    } else {
      await admin.from('shipments').insert(shipmentPayload);
    }
  }

  await writeAuditLog({
    actorUserId: actor.userId,
    actorRole: actor.role,
    action: 'order.updated',
    entityType: 'orders',
    entityId: existing.id,
    beforeState: { order_status: existing.order_status },
    afterState: parsed.data,
  });

  revalidatePath('/admin/orders');
  revalidatePath('/admin');
  return { ok: true };
}

export async function processStripeRefundAction(formData: FormData) {
  const actor = await requireAdminAction(['super_admin', 'admin', 'order_manager']);
  const orderId = String(formData.get('order_id') ?? '');
  const reason = String(formData.get('reason') ?? 'Customer requested refund');

  const admin = createAdminSupabaseClient();
  const { data: payment } = await admin
    .from('payments')
    .select('*')
    .eq('order_id', orderId)
    .eq('status', 'paid')
    .maybeSingle();

  if (!payment || !payment.provider_payment_intent_id) {
    return { error: 'No refundable paid online payment found for this order.' };
  }

  try {
    let providerRefundId = '';
    let refundStatus = 'pending';
    let refundAmountPaise = payment.amount_paise;

    if (payment.provider === 'razorpay') {
      if (!isRazorpayConfigured()) {
        return { error: 'Razorpay credentials are not configured on the server.' };
      }
      const rzpRefund = await createRazorpayRefund({
        paymentId: payment.provider_payment_intent_id,
        amountPaise: payment.amount_paise,
        notes: { order_id: orderId, reason },
      });
      providerRefundId = rzpRefund.id;
      refundStatus = rzpRefund.status === 'processed' ? 'succeeded' : 'pending';
      refundAmountPaise = rzpRefund.amount;
    } else {
      const provider = getActivePaymentProvider();
      if (!provider.isConfigured()) {
        return { error: 'Stripe credentials are not configured on the server.' };
      }
      const result = await provider.createRefund({
        paymentIntentId: payment.provider_payment_intent_id,
        amountPaise: payment.amount_paise,
        idempotencyKey: `refund_${orderId}_${Date.now()}`,
      });
      providerRefundId = result.providerRefundId;
      refundStatus = result.status === 'succeeded' ? 'succeeded' : 'pending';
      refundAmountPaise = result.amountPaise;
    }

    await admin.from('refunds').insert({
      order_id: orderId,
      payment_id: payment.id,
      provider_refund_id: providerRefundId,
      amount_paise: refundAmountPaise,
      reason,
      status: refundStatus,
      initiated_by: actor.userId,
    });

    await admin.from('orders').update({ payment_status: 'refunded' }).eq('id', orderId);
    await admin.from('payments').update({ status: 'refunded' }).eq('id', payment.id);

    await writeAuditLog({
      actorUserId: actor.userId,
      actorRole: actor.role,
      action: 'payment.refunded',
      entityType: 'orders',
      entityId: orderId,
      afterState: {
        provider: payment.provider,
        refund_id: providerRefundId,
        amount_paise: refundAmountPaise,
      },
    });

    revalidatePath('/admin/orders');
    revalidatePath('/admin');
    return { ok: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Refund failed.' };
  }
}

// -----------------------------------------------------------------------------
// OFFERS & COUPONS
// -----------------------------------------------------------------------------
export async function toggleOfferAction(formData: FormData) {
  const actor = await requireAdminAction(['super_admin', 'admin', 'content_manager']);
  const offerId = String(formData.get('offer_id') ?? '');
  const isActive = formData.get('next_active') === 'true';

  const admin = createAdminSupabaseClient();
  const { error } = await admin
    .from('offers')
    .update({ is_active: isActive })
    .eq('id', offerId);

  if (error) return { error: error.message };

  await writeAuditLog({
    actorUserId: actor.userId,
    actorRole: actor.role,
    action: 'offer.toggled',
    entityType: 'offers',
    entityId: offerId,
    afterState: { is_active: isActive },
  });

  revalidatePath('/');
  revalidatePath('/products/back-support-belt');
  revalidatePath('/admin/offers');
  return { ok: true };
}

export async function createCouponAction(formData: FormData) {
  const actor = await requireAdminAction(['super_admin', 'admin']);
  const code = String(formData.get('code') ?? '').trim().toUpperCase();
  const description = String(formData.get('description') ?? '').trim();
  const discountType = String(formData.get('discount_type') ?? 'fixed_paise');
  const rawVal = Number(formData.get('discount_value') ?? 0);
  const discountValue =
    discountType === 'fixed_paise' ? Math.round(rawVal * 100) : Math.round(rawVal);
  const minOrderPaise = toPaise(String(formData.get('min_order_rupees') ?? '0'));
  const maxDiscountRaw = String(formData.get('max_discount_rupees') ?? '').trim();
  const maxDiscountPaise = maxDiscountRaw ? toPaise(maxDiscountRaw) : null;
  const usageLimitRaw = String(formData.get('usage_limit') ?? '').trim();
  const usageLimit = usageLimitRaw ? parseInt(usageLimitRaw, 10) : null;
  const expiresAtRaw = String(formData.get('expires_at') ?? '').trim();

  if (!code || discountValue <= 0) {
    return { error: 'Coupon code and positive discount value are required.' };
  }

  const admin = createAdminSupabaseClient();
  const { error } = await admin.from('coupons').insert({
    code,
    description: description || null,
    discount_type: discountType,
    discount_value: discountValue,
    min_order_paise: minOrderPaise,
    max_discount_paise: maxDiscountPaise,
    usage_limit: usageLimit,
    expires_at: expiresAtRaw ? new Date(expiresAtRaw).toISOString() : null,
    is_active: true,
  });

  if (error) return { error: error.message };

  await writeAuditLog({
    actorUserId: actor.userId,
    actorRole: actor.role,
    action: 'coupon.created',
    entityType: 'coupons',
    entityId: code,
    afterState: { code, discount_type: discountType, discount_value: discountValue },
  });

  revalidatePath('/admin/discounts');
  return { ok: true };
}

export async function toggleCouponAction(formData: FormData) {
  const actor = await requireAdminAction(['super_admin', 'admin']);
  const couponId = String(formData.get('coupon_id') ?? '');
  const nextActive = formData.get('next_active') === 'true';
  const admin = createAdminSupabaseClient();

  await admin.from('coupons').update({ is_active: nextActive }).eq('id', couponId);
  await writeAuditLog({
    actorUserId: actor.userId,
    actorRole: actor.role,
    action: 'coupon.toggled',
    entityType: 'coupons',
    entityId: couponId,
    afterState: { is_active: nextActive },
  });

  revalidatePath('/admin/discounts');
  return { ok: true };
}

// -----------------------------------------------------------------------------
// REVIEWS MODERATION
// -----------------------------------------------------------------------------
export async function moderateReviewAction(formData: FormData) {
  const actor = await requireAdminAction(['super_admin', 'admin', 'content_manager']);
  const reviewId = String(formData.get('review_id') ?? '');
  const status = String(formData.get('status') ?? 'approved');
  const isFeatured = formData.get('is_featured') === 'true';

  const admin = createAdminSupabaseClient();
  const { error } = await admin
    .from('reviews')
    .update({ status, is_featured: isFeatured, moderated_by: actor.userId })
    .eq('id', reviewId);

  if (error) return { error: error.message };

  await writeAuditLog({
    actorUserId: actor.userId,
    actorRole: actor.role,
    action: `review.${status}`,
    entityType: 'reviews',
    entityId: reviewId,
    afterState: { status, is_featured: isFeatured },
  });

  revalidatePath('/');
  revalidatePath('/products/back-support-belt');
  revalidatePath('/admin/reviews');
  return { ok: true };
}

// -----------------------------------------------------------------------------
// CONTENT MANAGEMENT (Banners, Announcements, FAQs)
// -----------------------------------------------------------------------------
export async function updateBannerAction(formData: FormData) {
  const actor = await requireAdminAction(['super_admin', 'admin', 'content_manager']);
  const slot = String(formData.get('slot') ?? 'hero');
  const eyebrow = String(formData.get('eyebrow') ?? '').trim();
  const headline = String(formData.get('headline') ?? '').trim();
  const subheadline = String(formData.get('subheadline') ?? '').trim();
  const primaryCtaLabel = String(formData.get('primary_cta_label') ?? '').trim();
  const secondaryCtaLabel = String(formData.get('secondary_cta_label') ?? '').trim();

  if (!headline) return { error: 'Headline is required.' };

  const admin = createAdminSupabaseClient();
  const { error } = await admin
    .from('banners')
    .update({
      eyebrow: eyebrow || null,
      headline,
      subheadline: subheadline || null,
      primary_cta_label: primaryCtaLabel || null,
      secondary_cta_label: secondaryCtaLabel || null,
    })
    .eq('slot', slot);

  if (error) return { error: error.message };

  await writeAuditLog({
    actorUserId: actor.userId,
    actorRole: actor.role,
    action: 'banner.updated',
    entityType: 'banners',
    entityId: slot,
    afterState: { headline, subheadline },
  });

  revalidatePath('/');
  revalidatePath('/admin/content');
  return { ok: true };
}

export async function createAnnouncementAction(formData: FormData) {
  const actor = await requireAdminAction(['super_admin', 'admin', 'content_manager']);
  const message = String(formData.get('message') ?? '').trim();
  const linkLabel = String(formData.get('link_label') ?? '').trim();
  const linkHref = String(formData.get('link_href') ?? '').trim();

  if (!message) return { error: 'Announcement message is required.' };

  const admin = createAdminSupabaseClient();
  await admin.from('announcements').insert({
    message,
    link_label: linkLabel || null,
    link_href: linkHref || null,
    is_active: true,
  });

  await writeAuditLog({
    actorUserId: actor.userId,
    actorRole: actor.role,
    action: 'announcement.created',
    entityType: 'announcements',
    afterState: { message },
  });

  revalidatePath('/');
  revalidatePath('/admin/content');
  return { ok: true };
}

export async function createFaqAction(formData: FormData) {
  const actor = await requireAdminAction(['super_admin', 'admin', 'content_manager']);
  const category = String(formData.get('category') ?? 'Product').trim();
  const question = String(formData.get('question') ?? '').trim();
  const answer = String(formData.get('answer') ?? '').trim();

  if (!question || !answer) return { error: 'Question and answer are required.' };

  const admin = createAdminSupabaseClient();
  await admin.from('faqs').insert({
    category,
    question,
    answer,
    show_on_home: true,
    show_on_product: true,
    is_active: true,
  });

  await writeAuditLog({
    actorUserId: actor.userId,
    actorRole: actor.role,
    action: 'faq.created',
    entityType: 'faqs',
    afterState: { category, question },
  });

  revalidatePath('/');
  revalidatePath('/faq');
  revalidatePath('/products/back-support-belt');
  revalidatePath('/admin/content');
  return { ok: true };
}

// -----------------------------------------------------------------------------
// SHIPPING ZONES & STORE SETTINGS & ADMIN USERS
// -----------------------------------------------------------------------------
export async function updateShippingZoneAction(formData: FormData) {
  const actor = await requireAdminAction(['super_admin', 'admin', 'order_manager']);
  const zoneId = String(formData.get('zone_id') ?? '');
  const shippingChargePaise = toPaise(String(formData.get('shipping_charge_rupees') ?? '0'));
  const freeThresholdPaise = toPaise(String(formData.get('free_threshold_rupees') ?? '0'));
  const codAvailable = formData.get('cod_available') === 'on';
  const codFeePaise = toPaise(String(formData.get('cod_fee_rupees') ?? '0'));
  const minDays = parseInt(String(formData.get('estimated_min_days') ?? '3'), 10);
  const maxDays = parseInt(String(formData.get('estimated_max_days') ?? '6'), 10);

  const admin = createAdminSupabaseClient();
  const { error } = await admin
    .from('shipping_zones')
    .update({
      shipping_charge_paise: shippingChargePaise,
      free_shipping_threshold_paise: freeThresholdPaise,
      cod_available: codAvailable,
      cod_fee_paise: codFeePaise,
      estimated_min_days: minDays,
      estimated_max_days: Math.max(minDays, maxDays),
    })
    .eq('id', zoneId);

  if (error) return { error: error.message };

  await writeAuditLog({
    actorUserId: actor.userId,
    actorRole: actor.role,
    action: 'shipping_zone.updated',
    entityType: 'shipping_zones',
    entityId: zoneId,
    afterState: {
      shipping_charge_paise: shippingChargePaise,
      free_shipping_threshold_paise: freeThresholdPaise,
      cod_available: codAvailable,
    },
  });

  revalidatePath('/admin/shipping');
  return { ok: true };
}

export async function updateStoreSettingsAction(formData: FormData) {
  const actor = await requireAdminAction(['super_admin', 'admin']);
  const admin = createAdminSupabaseClient();

  const payload = {
    brand_name: String(formData.get('brand_name') ?? 'Kamora').trim(),
    tagline: String(formData.get('tagline') ?? '').trim(),
    support_email: String(formData.get('support_email') ?? '').trim(),
    support_phone: String(formData.get('support_phone') ?? '').trim(),
    whatsapp_number: String(formData.get('whatsapp_number') ?? '').trim() || null,
    business_legal_name: String(formData.get('business_legal_name') ?? '').trim(),
    business_address: String(formData.get('business_address') ?? '').trim(),
    gstin: String(formData.get('gstin') ?? '').trim() || null,
    cod_enabled: formData.get('cod_enabled') === 'on',
    gst_inclusive_pricing: formData.get('gst_inclusive_pricing') === 'on',
    free_shipping_threshold_paise: toPaise(String(formData.get('free_shipping_rupees') ?? '1499')),
    default_shipping_charge_paise: toPaise(String(formData.get('default_shipping_rupees') ?? '99')),
    return_window_days: parseInt(String(formData.get('return_window_days') ?? '7'), 10),
    store_live: formData.get('store_live') === 'on',
  };

  const { error } = await admin
    .from('store_settings')
    .update(payload)
    .eq('setting_key', 'default');

  if (error) return { error: error.message };

  await writeAuditLog({
    actorUserId: actor.userId,
    actorRole: actor.role,
    action: 'settings.updated',
    entityType: 'store_settings',
    entityId: 'default',
    afterState: payload,
  });

  revalidatePath('/', 'layout');
  revalidatePath('/admin/settings');
  return { ok: true };
}

export async function assignAdminRoleAction(formData: FormData) {
  const actor = await requireAdminAction(['super_admin']);
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const role = String(formData.get('role') ?? 'admin') as AdminRole;

  const admin = createAdminSupabaseClient();
  const { data: profile } = await admin
    .from('profiles')
    .select('id, email')
    .ilike('email', email)
    .maybeSingle();

  if (!profile) {
    return { error: 'No registered user found with that email address.' };
  }

  const { error } = await admin.from('admin_users').upsert(
    {
      user_id: profile.id,
      role,
      is_active: true,
      created_by: actor.userId,
    },
    { onConflict: 'user_id' }
  );

  if (error) return { error: error.message };

  await writeAuditLog({
    actorUserId: actor.userId,
    actorRole: actor.role,
    action: 'admin_user.assigned',
    entityType: 'admin_users',
    entityId: profile.id,
    afterState: { email, role },
  });

  revalidatePath('/admin/settings');
  return { ok: true };
}

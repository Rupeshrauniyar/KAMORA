import { NextResponse } from 'next/server';
import { reviewSubmitSchema } from '@/lib/validation/schemas';
import { createServerSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/server';
import { createAdminSupabaseClient, isServiceRoleConfigured } from '@/lib/supabase/admin';
import { ensureUserProfile } from '@/lib/auth/ensure-profile';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = reviewSubmitSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Invalid review submission.' },
        { status: 400 }
      );
    }

    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: 'Review submission requires a connected Supabase database.' },
        { status: 503 }
      );
    }

    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Please sign in to submit a customer review so we can verify purchases.' },
        { status: 401 }
      );
    }

    await ensureUserProfile(user, { full_name: parsed.data.author_name });
    const db = isServiceRoleConfigured() ? createAdminSupabaseClient() : supabase;

    // Check if the user has an actual paid/delivered order containing this product
    const { data: verifiedOrder } = await db
      .from('orders')
      .select('id, order_items!inner(product_id)')
      .eq('user_id', user.id)
      .eq('order_items.product_id', parsed.data.product_id)
      .in('order_status', ['confirmed', 'processing', 'shipped', 'out_for_delivery', 'delivered'])
      .limit(1)
      .maybeSingle();

    const { error } = await db.from('reviews').insert({
      product_id: parsed.data.product_id,
      user_id: user.id,
      order_id: verifiedOrder?.id ?? null,
      author_name: parsed.data.author_name,
      author_city: parsed.data.author_city || null,
      rating: parsed.data.rating,
      title: parsed.data.title,
      body: parsed.data.body,
      is_verified_purchase: Boolean(verifiedOrder),
      status: 'pending',
    });

    if (error) {
      return NextResponse.json({ error: 'Could not save review.' }, { status: 500 });
    }

    return NextResponse.json({
      message: verifiedOrder
        ? 'Thank you! Your verified buyer review has been submitted for moderation.'
        : 'Thank you! Your review has been submitted for admin moderation.',
    });
  } catch (err) {
    console.error('[POST /api/reviews]', err);
    return NextResponse.json({ error: 'Unable to submit review.' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { createServerSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/server';
import { ensureUserProfile } from '@/lib/auth/ensure-profile';

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ saved: false, message: 'Sign in after configuring Supabase to persist wishlist.' });
  }

  try {
    const { product_id } = (await request.json()) as { product_id?: string };
    if (!product_id) {
      return NextResponse.json({ error: 'product_id is required' }, { status: 400 });
    }

    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ saved: false, authenticated: false });
    }

    const { data: existing } = await supabase
      .from('wishlists')
      .select('id')
      .eq('user_id', user.id)
      .eq('product_id', product_id)
      .maybeSingle();

    if (existing) {
      await supabase.from('wishlists').delete().eq('id', existing.id);
      return NextResponse.json({ saved: false, authenticated: true });
    }

    await ensureUserProfile(user);
    await supabase.from('wishlists').insert({ user_id: user.id, product_id });
    return NextResponse.json({ saved: true, authenticated: true });
  } catch {
    return NextResponse.json({ error: 'Unable to update wishlist.' }, { status: 500 });
  }
}

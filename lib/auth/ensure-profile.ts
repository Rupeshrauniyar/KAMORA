import type { User } from '@supabase/supabase-js';
import { createAdminSupabaseClient, isServiceRoleConfigured } from '@/lib/supabase/admin';

interface ProfileFallbacks {
  full_name?: string | null;
  email?: string | null;
  phone?: string | null;
}

/**
 * Guarantees a matching row exists in `public.profiles` for an authenticated
 * `auth.users` account before inserting into tables with FK -> `public.profiles(id)`
 * (orders, user_addresses, carts, wishlists, reviews, coupon_redemptions).
 *
 * Prevents `orders_user_id_fkey` violations for users who signed up before
 * `on_auth_user_created` trigger existed or whose profile row was missing.
 */
export async function ensureUserProfile(
  user: User | null | undefined,
  fallbacks?: ProfileFallbacks
): Promise<boolean> {
  if (!user?.id || !isServiceRoleConfigured()) return false;

  try {
    const admin = createAdminSupabaseClient();
    const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
    const appMeta = (user.app_metadata ?? {}) as Record<string, unknown>;

    const fullName =
      (typeof meta.full_name === 'string' && meta.full_name.trim()) ||
      (typeof meta.name === 'string' && meta.name.trim()) ||
      fallbacks?.full_name?.trim() ||
      null;

    const avatarUrl =
      (typeof meta.avatar_url === 'string' && meta.avatar_url.trim()) ||
      (typeof meta.picture === 'string' && meta.picture.trim()) ||
      null;

    const provider =
      (typeof appMeta.provider === 'string' && appMeta.provider.trim()) || 'email';

    const { error } = await admin.from('profiles').upsert(
      {
        id: user.id,
        full_name: fullName,
        email: user.email ?? fallbacks?.email ?? null,
        phone: user.phone ?? fallbacks?.phone ?? null,
        avatar_url: avatarUrl,
        auth_provider: provider,
      },
      { onConflict: 'id', ignoreDuplicates: true }
    );

    if (error) {
      console.error('[ensureUserProfile] Failed to upsert profile:', error.message);
      return false;
    }

    return true;
  } catch (err) {
    console.error('[ensureUserProfile] Unexpected error:', err);
    return false;
  }
}

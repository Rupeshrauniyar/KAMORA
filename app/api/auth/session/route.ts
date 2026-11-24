import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { normalizeAuthCookieOptions } from '@/lib/supabase/cookie-options';
import { isAuthorizedAdminEmail } from '@/lib/auth/admin-allowlist';

export const dynamic = 'force-dynamic';

function buildRouteSupabase(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publicKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const isHttps = request.nextUrl.protocol === 'https:';
  const pendingCookies: {
    name: string;
    value: string;
    options?: Parameters<NextResponse['cookies']['set']>[2];
  }[] = [];

  if (!url || !publicKey) return null;

  const supabase = createServerClient(url, publicKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(
        cookiesToSet: {
          name: string;
          value: string;
          options?: Parameters<NextResponse['cookies']['set']>[2];
        }[]
      ) {
        pendingCookies.push(...cookiesToSet);
      },
    },
  });

  return { supabase, pendingCookies, isHttps };
}

export async function GET(request: NextRequest) {
  const built = buildRouteSupabase(request);
  if (!built) {
    return NextResponse.json({ user: null, isAdmin: false });
  }

  const { supabase, pendingCookies, isHttps } = built;
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let isAdmin = false;
  let fullName: string | null = null;

  if (user) {
    fullName =
      (user.user_metadata?.full_name as string | undefined) ??
      (user.user_metadata?.name as string | undefined) ??
      null;

    if (isAuthorizedAdminEmail(user.email, user.email_confirmed_at)) {
      isAdmin = true;
    } else {
      try {
        const { data: adminRow } = await supabase
          .from('admin_users')
          .select('role')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .maybeSingle();
        isAdmin = Boolean(adminRow);
      } catch {
        isAdmin = false;
      }
    }
  }

  const response = NextResponse.json(
    {
      user: user
        ? {
            id: user.id,
            email: user.email ?? null,
            phone: user.phone ?? null,
            full_name: fullName,
          }
        : null,
      isAdmin,
    },
    { headers: { 'Cache-Control': 'no-store' } }
  );

  for (const c of pendingCookies) {
    response.cookies.set(
      c.name,
      c.value,
      normalizeAuthCookieOptions(c.options, isHttps, c.value)
    );
  }

  return response;
}

export async function DELETE(request: NextRequest) {
  const built = buildRouteSupabase(request);
  if (!built) return NextResponse.json({ ok: true });

  const { supabase, pendingCookies, isHttps } = built;
  await supabase.auth.signOut();

  const response = NextResponse.json({ ok: true });
  for (const c of pendingCookies) {
    response.cookies.set(
      c.name,
      c.value,
      normalizeAuthCookieOptions(c.options, isHttps, c.value)
    );
  }
  return response;
}

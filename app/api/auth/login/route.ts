import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { normalizeAuthCookieOptions } from '@/lib/supabase/cookie-options';
import { isAuthorizedAdminEmail } from '@/lib/auth/admin-allowlist';
import { ensureUserProfile } from '@/lib/auth/ensure-profile';

/**
 * Server-side email/password login endpoint.
 * Writes durable 30-day Supabase session cookies directly on the HTTP Set-Cookie header
 * so the user stays signed in reliably across page reloads and browser restarts.
 */
export async function POST(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publicKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !publicKey) {
    return NextResponse.json({ error: 'Supabase Auth is not configured.' }, { status: 503 });
  }

  try {
    const body = (await request.json()) as { email?: string; password?: string };
    const email = (body.email ?? '').trim();
    const password = body.password ?? '';

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Please enter both email and password.' },
        { status: 400 }
      );
    }

    const isHttps = request.nextUrl.protocol === 'https:';
    const pendingCookies: {
      name: string;
      value: string;
      options?: Parameters<NextResponse['cookies']['set']>[2];
    }[] = [];

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

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.user) {
      return NextResponse.json(
        { error: error?.message ?? 'Invalid email or password.' },
        { status: 401 }
      );
    }

    await ensureUserProfile(data.user);

    let isAdmin = isAuthorizedAdminEmail(data.user.email, data.user.email_confirmed_at);
    if (!isAdmin) {
      try {
        const { data: adminRow } = await supabase
          .from('admin_users')
          .select('role')
          .eq('user_id', data.user.id)
          .eq('is_active', true)
          .maybeSingle();
        isAdmin = Boolean(adminRow);
      } catch {
        isAdmin = false;
      }
    }

    const response = NextResponse.json({
      ok: true,
      isAdmin,
      user: {
        id: data.user.id,
        email: data.user.email,
        full_name:
          (data.user.user_metadata?.full_name as string | undefined) ??
          (data.user.user_metadata?.name as string | undefined) ??
          null,
      },
    });

    for (const c of pendingCookies) {
      response.cookies.set(
        c.name,
        c.value,
        normalizeAuthCookieOptions(c.options, isHttps, c.value)
      );
    }

    return response;
  } catch {
    return NextResponse.json({ error: 'Unable to sign in right now.' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { newsletterSchema } from '@/lib/validation/schemas';
import { createAdminSupabaseClient, isServiceRoleConfigured } from '@/lib/supabase/admin';
import { createServerSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = newsletterSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Enter a valid email address.' },
        { status: 400 }
      );
    }

    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: 'Newsletter signup requires Supabase to be configured.' },
        { status: 503 }
      );
    }

    const db = isServiceRoleConfigured()
      ? createAdminSupabaseClient()
      : await createServerSupabaseClient();

    const { error } = await db.from('newsletter_subscribers').upsert(
      {
        email: parsed.data.email.toLowerCase(),
        source: parsed.data.source,
        is_subscribed: true,
        unsubscribed_at: null,
      },
      { onConflict: 'email' }
    );

    if (error) {
      return NextResponse.json({ error: 'Could not subscribe at this moment.' }, { status: 500 });
    }

    return NextResponse.json({
      message: 'Welcome to Kamora! You are subscribed to posture & comfort updates.',
    });
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }
}

import { NextResponse } from 'next/server';
import { createAdminSupabaseClient, isServiceRoleConfigured } from '@/lib/supabase/admin';

/**
 * One-time bootstrap endpoint to promote an existing Supabase Auth user to super_admin.
 * Protected by ADMIN_BOOTSTRAP_SECRET and refuses to run if a super_admin already exists.
 */
export async function POST(request: Request) {
  const expectedSecret = process.env.ADMIN_BOOTSTRAP_SECRET;
  if (!expectedSecret || expectedSecret.includes('replace-with') || !isServiceRoleConfigured()) {
    return NextResponse.json(
      { error: 'Admin bootstrap secret or Supabase service role is not configured.' },
      { status: 503 }
    );    
  }

  const authHeader = request.headers.get('x-bootstrap-secret');
  if (authHeader !== expectedSecret) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = (await request.json()) as { email?: string };
  if (!body.email) {
    return NextResponse.json({ error: 'email is required' }, { status: 400 });
  }

  const admin = createAdminSupabaseClient();

  const { count } = await admin
    .from('admin_users')
    .select('*', { count: 'exact', head: true })
    .eq('role', 'super_admin')
    .eq('is_active', true);

  if ((count ?? 0) > 0) {
    return NextResponse.json(
      { error: 'A super_admin already exists. Manage additional admins from /admin/settings.' },
      { status: 409 }
    );
  }

  const { data: usersData, error: listErr } = await admin.auth.admin.listUsers();
  if (listErr) {
    return NextResponse.json({ error: listErr.message }, { status: 500 });
  }

  const target = usersData.users.find(
    (u) => u.email?.toLowerCase() === body.email?.trim().toLowerCase()
  );

  if (!target) {
    return NextResponse.json(
      { error: 'No Supabase Auth user found with that email. Sign up first, then bootstrap.' },
      { status: 404 }
    );
  }

  const { error: insertErr } = await admin.from('admin_users').insert({
    user_id: target.id,
    role: 'super_admin',
    is_active: true,
  });

  if (insertErr) {
    return NextResponse.json({ error: insertErr.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    message: `${target.email} is now configured as super_admin.`,
  });
}

import 'server-only';
import { redirect } from 'next/navigation';
import { createServerSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/server';
import { createAdminSupabaseClient, isServiceRoleConfigured } from '@/lib/supabase/admin';
import { isAuthorizedAdminEmail } from '@/lib/auth/admin-allowlist';
import type { AdminRole } from '@/types/database';

export interface AdminContext {
  userId: string;
  email: string | null;
  fullName: string | null;
  role: AdminRole;
}

export const ALL_ADMIN_ROLES: AdminRole[] = [
  'super_admin',
  'admin',
  'order_manager',
  'inventory_manager',
  'content_manager',
];

export async function getAdminContext(): Promise<AdminContext | null> {
  if (!isSupabaseConfigured()) return null;

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const db = isServiceRoleConfigured() ? createAdminSupabaseClient() : supabase;

  let role: AdminRole | null = null;
  let fullName: string | null =
    (user.user_metadata?.full_name as string | undefined) ??
    (user.user_metadata?.name as string | undefined) ??
    null;

  try {
    const { data: adminRow } = await db
      .from('admin_users')
      .select('role, is_active')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle();

    if (adminRow?.role) {
      role = adminRow.role as AdminRole;
    }

    const { data: profile } = await db
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .maybeSingle();

    if (profile?.full_name) {
      fullName = profile.full_name;
    }
  } catch {
    // Tables may not be migrated yet; check server-only ADMIN_EMAILS allowlist below
  }

  if (!role && isAuthorizedAdminEmail(user.email, user.email_confirmed_at)) {
    role = 'super_admin';
  }

  if (!role) return null;

  return {
    userId: user.id,
    email: user.email ?? null,
    fullName: fullName ?? user.email ?? 'Admin',
    role,
  };
}

export async function requireAdmin(
  allowedRoles: AdminRole[] = ALL_ADMIN_ROLES
): Promise<AdminContext> {
  const ctx = await getAdminContext();
  if (!ctx) {
    redirect('/login?next=/admin');
  }
  if (!allowedRoles.includes(ctx.role)) {
    redirect('/admin?error=insufficient_permissions');
  }
  return ctx;
}

export async function requireAdminAction(
  allowedRoles: AdminRole[] = ALL_ADMIN_ROLES
): Promise<AdminContext> {
  const ctx = await getAdminContext();
  if (!ctx) {
    throw new Error('Unauthorized: Admin authentication required.');
  }
  if (!allowedRoles.includes(ctx.role)) {
    throw new Error(`Forbidden: Role "${ctx.role}" lacks permission for this operation.`);
  }
  return ctx;
}

export async function writeAuditLog(params: {
  actorUserId: string;
  actorRole: string;
  action: string;
  entityType: string;
  entityId?: string;
  beforeState?: unknown;
  afterState?: unknown;
}) {
  if (!isServiceRoleConfigured()) return;

  try {
    const admin = createAdminSupabaseClient();
    await admin.from('audit_logs').insert({
      actor_user_id: params.actorUserId,
      actor_role: params.actorRole,
      action: params.action,
      entity_type: params.entityType,
      entity_id: params.entityId ?? null,
      before_state: params.beforeState ?? null,
      after_state: params.afterState ?? null,
    });
  } catch (err) {
    console.error('[AuditLog] Failed to record audit entry:', err);
  }
}

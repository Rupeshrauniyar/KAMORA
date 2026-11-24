import { requireAdmin } from '@/lib/auth/admin';
import { createAdminSupabaseClient, isServiceRoleConfigured } from '@/lib/supabase/admin';
import { AdminShell } from '@/components/admin/admin-shell';

export const dynamic = 'force-dynamic';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await requireAdmin();

  let schemaMissing = false;
  if (isServiceRoleConfigured()) {
    try {
      const db = createAdminSupabaseClient();
      const { error } = await db.from('products').select('id').limit(1);
      if (error && error.code === 'PGRST205') {
        schemaMissing = true;
      }
    } catch {
      schemaMissing = true;
    }
  }

  return (
    <AdminShell admin={admin}>
      {schemaMissing && (
        <div className="mb-6 rounded-[16px] border border-amber-300 bg-amber-50 px-5 py-4 text-sm text-amber-950">
          <p className="font-semibold">
            Database tables are not initialized in Supabase yet.
          </p>
          <p className="mt-1 text-xs leading-relaxed text-amber-900">
            Open <strong>Supabase Dashboard → SQL Editor → New Query</strong>, paste the contents
            of <code>supabase/setup_all.sql</code>, and click <strong>Run</strong> to activate
            live products, inventory, orders, coupons, and analytics.
          </p>
        </div>
      )}
      {children}
    </AdminShell>
  );
}

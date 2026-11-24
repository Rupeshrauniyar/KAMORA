import { requireAdmin } from '@/lib/auth/admin';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { formatISTDate, formatPaise } from '@/lib/utils/format';
import { Badge } from '@/components/ui/badge';

export default async function AdminCustomersPage() {
  await requireAdmin(['super_admin', 'admin', 'order_manager']);
  const admin = createAdminSupabaseClient();

  const [{ data: profiles }, { data: orders }] = await Promise.all([
    admin
      .from('profiles')
      .select('id, full_name, email, phone, auth_provider, created_at')
      .order('created_at', { ascending: false })
      .limit(200),
    admin
      .from('orders')
      .select('user_id, customer_email, total_paise, order_status')
      .neq('order_status', 'cancelled'),
  ]);

  const statsByEmail = new Map<string, { orders: number; ltvPaise: number }>();
  for (const o of orders ?? []) {
    const key = o.customer_email.toLowerCase();
    const cur = statsByEmail.get(key) ?? { orders: 0, ltvPaise: 0 };
    cur.orders += 1;
    cur.ltvPaise += o.total_paise;
    statsByEmail.set(key, cur);
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-heading text-xl font-bold text-[#11151B]">
          Customers ({profiles?.length ?? 0})
        </h2>
        <p className="text-xs text-[#5C636E]">
          Customer directory with order counts and lifetime value (no sensitive auth credentials
          exposed).
        </p>
      </div>

      <div className="overflow-x-auto rounded-[18px] border border-[#E6E3DC] bg-white shadow-soft">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-[#E6E3DC] bg-[#FAFAF8] text-xs uppercase text-[#5C636E]">
            <tr>
              <th className="px-4 py-3.5">Customer</th>
              <th className="px-4 py-3.5">Contact</th>
              <th className="px-4 py-3.5">Auth Method</th>
              <th className="px-4 py-3.5">Orders</th>
              <th className="px-4 py-3.5">Lifetime Value</th>
              <th className="px-4 py-3.5">Joined</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E6E3DC]">
            {(profiles ?? []).map((p) => {
              const stat = p.email
                ? statsByEmail.get(p.email.toLowerCase()) ?? { orders: 0, ltvPaise: 0 }
                : { orders: 0, ltvPaise: 0 };
              return (
                <tr key={p.id} className="hover:bg-[#FAFAF8]/70">
                  <td className="px-4 py-3.5 font-semibold text-[#11151B]">
                    {p.full_name ?? 'Unnamed Customer'}
                  </td>
                  <td className="px-4 py-3.5 text-xs text-[#5C636E]">
                    <p>{p.email ?? '—'}</p>
                    <p>{p.phone ?? '—'}</p>
                  </td>
                  <td className="px-4 py-3.5">
                    <Badge variant="outline">{p.auth_provider ?? 'email'}</Badge>
                  </td>
                  <td className="px-4 py-3.5 font-medium">{stat.orders}</td>
                  <td className="px-4 py-3.5 font-semibold text-[#11151B]">
                    {formatPaise(stat.ltvPaise)}
                  </td>
                  <td className="px-4 py-3.5 text-xs text-[#5C636E]">
                    {formatISTDate(p.created_at)}
                  </td>
                </tr>
              );
            })}
            {(!profiles || profiles.length === 0) && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-sm text-[#5C636E]">
                  No registered customer profiles yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

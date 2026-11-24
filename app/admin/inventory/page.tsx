import { requireAdmin } from '@/lib/auth/admin';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { adjustInventoryAction } from '@/actions/admin/mutations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatISTDateTime } from '@/lib/utils/format';

export default async function AdminInventoryPage() {
  await requireAdmin(['super_admin', 'admin', 'inventory_manager']);
  const admin = createAdminSupabaseClient();

  const [{ data: rows }, { data: movements }] = await Promise.all([
    admin
      .from('product_variants')
      .select('id, sku, size_code, size_label, inventory(*)')
      .order('sort_order', { ascending: true }),
    admin
      .from('inventory_movements')
      .select('*, variant:product_variants(sku, size_code)')
      .order('created_at', { ascending: false })
      .limit(30),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-heading text-xl font-bold text-[#11151B]">
          Inventory &amp; Stock Ledger
        </h2>
        <p className="text-xs text-[#5C636E]">
          Row-locked transactional stock prevents overselling during concurrent checkouts. Every
          manual correction is logged in the stock movement ledger.
        </p>
      </div>

      {/* Stock Table + Inline Adjustment */}
      <div className="space-y-3">
        {(rows ?? []).map((row) => {
          const inv = Array.isArray(row.inventory) ? row.inventory[0] : row.inventory;
          const onHand = inv?.stock_on_hand ?? 0;
          const reserved = inv?.stock_reserved ?? 0;
          const available = Math.max(0, onHand - reserved);
          const low = available <= (inv?.low_stock_threshold ?? 10);

          return (
            <div
              key={row.id}
              className="grid items-center gap-4 rounded-[18px] border border-[#E6E3DC] bg-white p-5 shadow-soft lg:grid-cols-12"
            >
              <div className="lg:col-span-3">
                <p className="font-heading text-sm font-bold text-[#11151B]">
                  {row.size_label}
                </p>
                <p className="text-xs text-[#5C636E]">SKU: {row.sku}</p>
              </div>
              <div className="flex flex-wrap gap-3 text-xs lg:col-span-4">
                <div>
                  <span className="text-[#5C636E]">On Hand: </span>
                  <strong className="text-[#11151B]">{onHand}</strong>
                </div>
                <div>
                  <span className="text-[#5C636E]">Reserved: </span>
                  <strong className="text-[#11151B]">{reserved}</strong>
                </div>
                <div>
                  <span className="text-[#5C636E]">Available: </span>
                  <Badge variant={available === 0 ? 'danger' : low ? 'warning' : 'success'}>
                    {available}
                  </Badge>
                </div>
              </div>
              <form
                action={async (fd) => {
                  'use server';
                  await adjustInventoryAction(fd);
                }}
                className="flex flex-wrap items-center gap-2 lg:col-span-5"
              >
                <input type="hidden" name="variant_id" value={row.id} />
                <Input
                  name="quantity_delta"
                  type="number"
                  required
                  placeholder="+25 or -5"
                  className="w-28"
                />
                <Input
                  name="reason"
                  required
                  placeholder="Restock / count correction"
                  className="flex-1 min-w-[140px]"
                />
                <Button type="submit" variant="secondary" size="sm">
                  Adjust
                </Button>
              </form>
            </div>
          );
        })}
      </div>

      {/* Movement History */}
      <div className="rounded-[20px] border border-[#E6E3DC] bg-white p-6 shadow-soft">
        <h3 className="font-heading text-base font-bold text-[#11151B]">
          Recent Stock Movements
        </h3>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-[#E6E3DC] text-[#5C636E] uppercase">
              <tr>
                <th className="py-2.5 pr-4">Date (IST)</th>
                <th className="py-2.5 pr-4">SKU</th>
                <th className="py-2.5 pr-4">Type</th>
                <th className="py-2.5 pr-4">Delta</th>
                <th className="py-2.5 pr-4">Before → After</th>
                <th className="py-2.5">Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E6E3DC]/80">
              {(movements ?? []).map((m) => {
                const v = Array.isArray(m.variant) ? m.variant[0] : m.variant;
                return (
                  <tr key={m.id}>
                    <td className="py-2.5 pr-4 text-[#5C636E]">{formatISTDateTime(m.created_at)}</td>
                    <td className="py-2.5 pr-4 font-semibold">{v?.sku ?? '—'}</td>
                    <td className="py-2.5 pr-4 capitalize">
                      {String(m.movement_type).replaceAll('_', ' ')}
                    </td>
                    <td
                      className={`py-2.5 pr-4 font-bold ${
                        m.quantity_delta > 0 ? 'text-emerald-700' : 'text-rose-600'
                      }`}
                    >
                      {m.quantity_delta > 0 ? `+${m.quantity_delta}` : m.quantity_delta}
                    </td>
                    <td className="py-2.5 pr-4">
                      {m.stock_before} → {m.stock_after}
                    </td>
                    <td className="py-2.5 text-[#5C636E]">{m.reason ?? '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

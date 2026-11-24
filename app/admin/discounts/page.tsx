import { requireAdmin } from '@/lib/auth/admin';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { createCouponAction, toggleCouponAction } from '@/actions/admin/mutations';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/card';
import { formatISTDate, formatPaise } from '@/lib/utils/format';

export default async function AdminDiscountsPage() {
  await requireAdmin(['super_admin', 'admin']);
  const admin = createAdminSupabaseClient();

  const { data: coupons } = await admin
    .from('coupons')
    .select('*')
    .order('created_at', { ascending: false });

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-heading text-xl font-bold text-[#11151B]">
          Coupon &amp; Discount Management
        </h2>
        <p className="text-xs text-[#5C636E]">
          Create fixed-INR or percentage coupon codes validated strictly on the server during
          checkout.
        </p>
      </div>

      {/* Create Coupon Form */}
      <form
        action={async (fd) => {
          'use server';
          await createCouponAction(fd);
        }}
        className="rounded-[20px] border border-[#E6E3DC] bg-white p-6 shadow-soft space-y-4"
      >
        <h3 className="font-heading text-base font-bold text-[#11151B]">Create New Coupon</h3>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs font-semibold">Coupon Code *</label>
            <Input name="code" required placeholder="POSTURE10" className="uppercase" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold">Discount Type</label>
            <Select name="discount_type" defaultValue="fixed_paise">
              <option value="fixed_paise">Fixed Amount (₹ INR)</option>
              <option value="percentage">Percentage (%)</option>
            </Select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold">Value (₹ or %) *</label>
            <Input name="discount_value" type="number" min="1" required placeholder="150" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold">Min Order (₹)</label>
            <Input name="min_order_rupees" type="number" defaultValue="1499" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold">Max Discount Cap (₹)</label>
            <Input name="max_discount_rupees" type="number" placeholder="Optional" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold">Usage Limit</label>
            <Input name="usage_limit" type="number" placeholder="Unlimited if empty" />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-semibold">Description</label>
            <Input name="description" placeholder="Launch welcome discount" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold">Expiry Date (Optional)</label>
            <Input name="expires_at" type="date" />
          </div>
        </div>
        <Button type="submit" variant="primary">
          Create Coupon
        </Button>
      </form>

      {/* Coupons List */}
      <div className="overflow-x-auto rounded-[18px] border border-[#E6E3DC] bg-white shadow-soft">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-[#E6E3DC] bg-[#FAFAF8] text-xs uppercase text-[#5C636E]">
            <tr>
              <th className="px-4 py-3">Code</th>
              <th className="px-4 py-3">Value</th>
              <th className="px-4 py-3">Min Order</th>
              <th className="px-4 py-3">Usage</th>
              <th className="px-4 py-3">Expiry</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E6E3DC]">
            {(coupons ?? []).map((c) => (
              <tr key={c.id}>
                <td className="px-4 py-3 font-heading font-bold text-[#11151B]">{c.code}</td>
                <td className="px-4 py-3">
                  {c.discount_type === 'fixed_paise'
                    ? formatPaise(c.discount_value)
                    : `${c.discount_value}%`}
                </td>
                <td className="px-4 py-3">{formatPaise(c.min_order_paise)}</td>
                <td className="px-4 py-3 text-xs">
                  {c.usage_count} / {c.usage_limit ?? '∞'}
                </td>
                <td className="px-4 py-3 text-xs text-[#5C636E]">
                  {c.expires_at ? formatISTDate(c.expires_at) : 'No expiry'}
                </td>
                <td className="px-4 py-3">
                  <Badge variant={c.is_active ? 'success' : 'outline'}>
                    {c.is_active ? 'Active' : 'Disabled'}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <form
                    action={async (fd) => {
                      'use server';
                      await toggleCouponAction(fd);
                    }}
                  >
                    <input type="hidden" name="coupon_id" value={c.id} />
                    <input type="hidden" name="next_active" value={String(!c.is_active)} />
                    <Button type="submit" variant="secondary" size="sm">
                      {c.is_active ? 'Disable' : 'Enable'}
                    </Button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

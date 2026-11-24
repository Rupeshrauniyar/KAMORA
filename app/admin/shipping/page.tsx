import { requireAdmin } from '@/lib/auth/admin';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { updateShippingZoneAction } from '@/actions/admin/mutations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/card';

export default async function AdminShippingPage() {
  await requireAdmin(['super_admin', 'admin', 'order_manager']);
  const admin = createAdminSupabaseClient();

  const { data: zones } = await admin
    .from('shipping_zones')
    .select('*')
    .order('estimated_min_days', { ascending: true });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-heading text-xl font-bold text-[#11151B]">
          Indian Shipping Zones &amp; PIN Code Rules
        </h2>
        <p className="text-xs text-[#5C636E]">
          Configure shipping fees, free-shipping thresholds, COD eligibility, and estimated
          delivery windows by Indian PIN prefix.
        </p>
      </div>

      <div className="space-y-4">
        {(zones ?? []).map((z) => (
          <form
            key={z.id}
            action={async (fd) => {
              'use server';
              await updateShippingZoneAction(fd);
            }}
            className="rounded-[20px] border border-[#E6E3DC] bg-white p-6 shadow-soft space-y-4"
          >
            <input type="hidden" name="zone_id" value={z.id} />
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="font-heading text-base font-bold text-[#11151B]">{z.name}</h3>
                <p className="text-xs text-[#5C636E]">
                  PIN Prefixes: {(z.pincode_prefixes ?? []).join(', ')}
                </p>
              </div>
              <Button type="submit" variant="secondary" size="sm">
                Save Zone
              </Button>
            </div>

            <div className="grid gap-3 sm:grid-cols-6">
              <div>
                <label className="mb-1 block text-[11px] font-semibold">Shipping (₹)</label>
                <Input
                  name="shipping_charge_rupees"
                  type="number"
                  defaultValue={z.shipping_charge_paise / 100}
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-semibold">Free Above (₹)</label>
                <Input
                  name="free_threshold_rupees"
                  type="number"
                  defaultValue={z.free_shipping_threshold_paise / 100}
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-semibold">COD Fee (₹)</label>
                <Input
                  name="cod_fee_rupees"
                  type="number"
                  defaultValue={z.cod_fee_paise / 100}
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-semibold">Min Days</label>
                <Input
                  name="estimated_min_days"
                  type="number"
                  defaultValue={z.estimated_min_days}
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-semibold">Max Days</label>
                <Input
                  name="estimated_max_days"
                  type="number"
                  defaultValue={z.estimated_max_days}
                />
              </div>
              <div className="flex items-end pb-2.5">
                <label className="inline-flex items-center gap-2 text-xs font-medium">
                  <input
                    type="checkbox"
                    name="cod_available"
                    defaultChecked={z.cod_available}
                    className="h-4 w-4 accent-[#0E1116]"
                  />
                  COD Enabled
                </label>
              </div>
            </div>
          </form>
        ))}
      </div>
    </div>
  );
}

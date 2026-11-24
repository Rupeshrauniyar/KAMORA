import { requireAdmin } from '@/lib/auth/admin';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { toggleOfferAction } from '@/actions/admin/mutations';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatPaise } from '@/lib/utils/format';

export default async function AdminOffersPage() {
  await requireAdmin(['super_admin', 'admin', 'content_manager']);
  const admin = createAdminSupabaseClient();

  const [{ data: offers }, { data: orders }] = await Promise.all([
    admin
      .from('offers')
      .select('*, items:offer_items(*)')
      .order('sort_order', { ascending: true }),
    admin
      .from('orders')
      .select('applied_offer_codes, total_paise, order_status')
      .neq('order_status', 'cancelled'),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-heading text-xl font-bold text-[#11151B]">
          Offers &amp; Promotional Campaigns
        </h2>
        <p className="text-xs text-[#5C636E]">
          Manage The Complete Back Comfort Kit, Family Comfort Add-On, and campaign windows
          without redeploying.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {(offers ?? []).map((offer) => {
          const matchingOrders = (orders ?? []).filter((o) =>
            Array.isArray(o.applied_offer_codes) && o.applied_offer_codes.includes(offer.code)
          );
          const revenuePaise = matchingOrders.reduce((s, o) => s + o.total_paise, 0);

          return (
            <div
              key={offer.id}
              className="flex flex-col justify-between rounded-[20px] border border-[#E6E3DC] bg-white p-6 shadow-soft"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <Badge variant={offer.is_active ? 'success' : 'outline'}>
                      {offer.is_active ? 'Active' : 'Paused'}
                    </Badge>
                    <h3 className="mt-2 font-heading text-lg font-bold text-[#11151B]">
                      {offer.name}
                    </h3>
                    <p className="text-xs text-[#1C3D5A] font-medium">{offer.code}</p>
                  </div>
                  <form
                    action={async (fd) => {
                      'use server';
                      await toggleOfferAction(fd);
                    }}
                  >
                    <input type="hidden" name="offer_id" value={offer.id} />
                    <input
                      type="hidden"
                      name="next_active"
                      value={String(!offer.is_active)}
                    />
                    <Button type="submit" variant="secondary" size="sm">
                      {offer.is_active ? 'Pause Offer' : 'Activate'}
                    </Button>
                  </form>
                </div>

                <p className="mt-3 text-sm text-[#5C636E]">{offer.headline}</p>

                <div className="mt-4 grid grid-cols-3 gap-3 rounded-[14px] border border-[#E6E3DC] bg-[#FAFAF8] p-3.5 text-xs">
                  <div>
                    <p className="text-[#5C636E]">Discount</p>
                    <p className="mt-0.5 font-bold text-[#11151B]">
                      {offer.discount_type === 'fixed_paise'
                        ? formatPaise(offer.discount_value)
                        : `${offer.discount_value}%`}
                    </p>
                  </div>
                  <div>
                    <p className="text-[#5C636E]">Orders</p>
                    <p className="mt-0.5 font-bold text-[#11151B]">{matchingOrders.length}</p>
                  </div>
                  <div>
                    <p className="text-[#5C636E]">Revenue</p>
                    <p className="mt-0.5 font-bold text-[#11151B]">
                      {formatPaise(revenuePaise)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

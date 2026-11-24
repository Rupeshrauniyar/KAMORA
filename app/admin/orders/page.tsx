import { requireAdmin } from '@/lib/auth/admin';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { OrdersTable } from '@/components/admin/orders-table';
import type { OrderRecord } from '@/types/database';

export default async function AdminOrdersPage() {
  await requireAdmin(['super_admin', 'admin', 'order_manager']);
  const admin = createAdminSupabaseClient();

  const { data } = await admin
    .from('orders')
    .select(
      `
      *,
      items:order_items(id, product_name, variant_label, sku, quantity, unit_price_paise, line_total_paise),
      shipments(courier_name, tracking_number, tracking_url, shipment_status, estimated_delivery_date)
    `
    )
    .order('created_at', { ascending: false })
    .limit(200);

  const orders: OrderRecord[] = (data ?? []).map((row) => ({
    ...(row as unknown as OrderRecord),
    shipment: Array.isArray(row.shipments) ? row.shipments[0] ?? null : row.shipments ?? null,
  }));

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-heading text-xl font-bold text-[#11151B]">
          Orders &amp; Fulfilment ({orders.length})
        </h2>
        <p className="text-xs text-[#5C636E]">
          Search, update fulfilment statuses, attach courier AWBs, cancel with automatic stock
          restoration, and process Stripe refunds.
        </p>
      </div>
      <OrdersTable orders={orders} />
    </div>
  );
}

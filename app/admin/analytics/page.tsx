import { requireAdmin } from '@/lib/auth/admin';
import { getAdminMetrics } from '@/lib/analytics/admin-metrics';
import { RevenueCharts } from '@/components/admin/revenue-charts';
import { formatPaise } from '@/lib/utils/format';
   
export default async function AdminAnalyticsPage() {
  await requireAdmin(['super_admin', 'admin']);
  const metrics = await getAdminMetrics('90d');
  const { kpis } = metrics;
  const netSalesPaise = Math.max(0, kpis.totalRevenuePaise - kpis.refundedPaise);

  const summary = [
    { label: 'Gross Sales (90d)', value: formatPaise(kpis.grossSalesPaise) },
    { label: 'Discounts & Offers Impact', value: `–${formatPaise(kpis.discountsImpactPaise)}` },
    { label: 'Refunds Issued', value: `–${formatPaise(kpis.refundedPaise)}` },
    { label: 'Net Revenue', value: formatPaise(netSalesPaise) },
    { label: 'Average Order Value', value: formatPaise(kpis.averageOrderValuePaise) },
    { label: 'Returning Customer Rate', value: `${kpis.returningCustomerRatePct}%` },
    { label: 'Payment Success Rate', value: `${kpis.paymentSuccessRatePct}%` },
    { label: 'Completed + Active Orders', value: String(kpis.totalOrders - kpis.cancelledOrders) },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-heading text-xl font-bold text-[#11151B]">
          Advanced Commerce Analytics (Last 90 Days)
        </h2>
        <p className="text-xs text-[#5C636E]">
          Actual sales accounting computed strictly from verified orders, payments, and refunds.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {summary.map((item) => (
          <div
            key={item.label}
            className="rounded-[18px] border border-[#E6E3DC] bg-white p-5 shadow-soft"
          >
            <p className="text-xs text-[#5C636E]">{item.label}</p>
            <p className="mt-2 font-heading text-2xl font-bold text-[#11151B]">{item.value}</p>
          </div>
        ))}
      </div>

      <RevenueCharts
        revenueSeries={metrics.revenueSeries}
        paymentMethodBreakdown={metrics.paymentMethodBreakdown}
        orderStatusBreakdown={metrics.orderStatusBreakdown}
      />
    </div>
  );
}

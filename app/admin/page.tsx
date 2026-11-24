import Link from 'next/link';
import {
  IndianRupee,
  ShoppingCart,
  Users,
  TrendingUp,
  Clock,
  XCircle,
  RefreshCcw,
  Boxes,
} from 'lucide-react';
import { getAdminMetrics, type DateRangePreset } from '@/lib/analytics/admin-metrics';
import { RevenueCharts } from '@/components/admin/revenue-charts';
import { formatPaise } from '@/lib/utils/format';
import { Badge } from '@/components/ui/badge';

const PRESETS: { id: DateRangePreset; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: '7d', label: 'Last 7d' },
  { id: '30d', label: 'Last 30d' },
  { id: '90d', label: 'Last 90d' },
  { id: 'this_month', label: 'This Month' },
  { id: 'prev_month', label: 'Prev Month' },
];

export default async function AdminOverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const { range } = await searchParams;
  const preset = (PRESETS.some((p) => p.id === range) ? range : '30d') as DateRangePreset;
  const metrics = await getAdminMetrics(preset);
  const { kpis } = metrics;

  const cards = [
    {
      label: 'Total Revenue',
      value: formatPaise(kpis.totalRevenuePaise),
      change: kpis.revenueChangePct,
      icon: IndianRupee,
    },
    {
      label: 'Total Orders',
      value: String(kpis.totalOrders),
      change: kpis.ordersChangePct,
      icon: ShoppingCart,
    },
    {
      label: 'Total Customers',
      value: String(kpis.totalCustomers),
      change: null,
      icon: Users,
    },
    {
      label: 'Average Order Value',
      value: formatPaise(kpis.averageOrderValuePaise),
      change: null,
      icon: TrendingUp,
    },
    {
      label: 'Pending Fulfilment',
      value: String(kpis.pendingOrders),
      change: null,
      icon: Clock,
    },
    {
      label: 'Cancelled Orders',
      value: String(kpis.cancelledOrders),
      change: null,
      icon: XCircle,
    },
    {
      label: 'Refunds Issued',
      value: formatPaise(kpis.refundedPaise),
      change: null,
      icon: RefreshCcw,
    },
    {
      label: 'Available Stock',
      value: `${kpis.totalInventoryAvailable} units`,
      change: null,
      sub: kpis.lowStockVariants > 0 ? `${kpis.lowStockVariants} low-stock sizes` : 'Healthy stock',
      icon: Boxes,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Range Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-heading text-xl font-bold text-[#11151B]">
            Business Overview — {metrics.rangeLabel}
          </h2>
          <p className="text-xs text-[#5C636E]">
            Real-time telemetry calculated directly from Supabase PostgreSQL records.
          </p>
        </div>

        <div className="flex flex-wrap gap-1.5 rounded-[14px] border border-[#E6E3DC] bg-white p-1">
          {PRESETS.map((p) => (
            <Link
              key={p.id}
              href={`/admin?range=${p.id}`}
              className={`rounded-[10px] px-3 py-1.5 text-xs font-semibold transition ${
                preset === p.id
                  ? 'bg-[#0E1116] text-white'
                  : 'text-[#5C636E] hover:bg-[#F2F0EB] hover:text-[#11151B]'
              }`}
            >
              {p.label}
            </Link>
          ))}
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <div
            key={card.label}
            className="rounded-[18px] border border-[#E6E3DC] bg-white p-5 shadow-soft"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[#5C636E]">{card.label}</span>
              <span className="flex h-9 w-9 items-center justify-center rounded-[11px] bg-[#F2F0EB] text-[#1C3D5A]">
                <card.icon className="h-4 w-4" />
              </span>
            </div>
            <p className="mt-3 font-heading text-2xl font-bold text-[#11151B]">{card.value}</p>
            <div className="mt-2 flex items-center gap-2 text-xs">
              {card.change !== null && (
                <Badge variant={card.change >= 0 ? 'success' : 'danger'}>
                  {card.change >= 0 ? '+' : ''}
                  {card.change}% vs prev
                </Badge>
              )}
              {card.sub && <span className="text-[#5C636E]">{card.sub}</span>}
            </div>
          </div>
        ))}
      </div>

      {/* Recharts Visualizations */}
      <RevenueCharts
        revenueSeries={metrics.revenueSeries}
        paymentMethodBreakdown={metrics.paymentMethodBreakdown}
        orderStatusBreakdown={metrics.orderStatusBreakdown}
      />
    </div>
  );
}

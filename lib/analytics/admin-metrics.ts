import 'server-only';
import { createAdminSupabaseClient, isServiceRoleConfigured } from '@/lib/supabase/admin';

export type DateRangePreset = 'today' | '7d' | '30d' | '90d' | 'this_month' | 'prev_month';

export interface AdminDashboardMetrics {
  rangeLabel: string;
  kpis: {
    totalRevenuePaise: number;
    prevRevenuePaise: number;
    revenueChangePct: number | null;
    totalOrders: number;
    prevOrders: number;
    ordersChangePct: number | null;
    totalCustomers: number;
    averageOrderValuePaise: number;
    pendingOrders: number;
    cancelledOrders: number;
    refundedPaise: number;
    totalInventoryAvailable: number;
    lowStockVariants: number;
    grossSalesPaise: number;
    discountsImpactPaise: number;
    returningCustomerRatePct: number;
    paymentSuccessRatePct: number;
  };
  revenueSeries: { date: string; revenueRupees: number; orders: number }[];
  paymentMethodBreakdown: { method: string; count: number; revenueRupees: number }[];
  orderStatusBreakdown: { status: string; count: number }[];
}

function getDateWindow(preset: DateRangePreset): {
  start: Date;
  end: Date;
  prevStart: Date;
  prevEnd: Date;
  label: string;
} {
  const now = new Date();
  const end = now;
  let start = new Date(now);
  let label = 'Last 30 Days';

  switch (preset) {
    case 'today':
      start.setHours(0, 0, 0, 0);
      label = 'Today';
      break;
    case '7d':
      start = new Date(now.getTime() - 7 * 86400_000);
      label = 'Last 7 Days';
      break;
    case '90d':
      start = new Date(now.getTime() - 90 * 86400_000);
      label = 'Last 90 Days';
      break;
    case 'this_month':
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      label = 'This Month';
      break;
    case 'prev_month': {
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
      const span = prevMonthEnd.getTime() - start.getTime();
      return {
        start,
        end: prevMonthEnd,
        prevStart: new Date(start.getTime() - span),
        prevEnd: start,
        label: 'Previous Month',
      };
    }
    case '30d':
    default:
      start = new Date(now.getTime() - 30 * 86400_000);
      label = 'Last 30 Days';
      break;
  }

  const spanMs = Math.max(86400_000, end.getTime() - start.getTime());
  return {
    start,
    end,
    prevStart: new Date(start.getTime() - spanMs),
    prevEnd: start,
    label,
  };
}

function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

export async function getAdminMetrics(
  preset: DateRangePreset = '30d'
): Promise<AdminDashboardMetrics> {
  const window = getDateWindow(preset);

  const empty: AdminDashboardMetrics = {
    rangeLabel: window.label,
    kpis: {
      totalRevenuePaise: 0,
      prevRevenuePaise: 0,
      revenueChangePct: 0,
      totalOrders: 0,
      prevOrders: 0,
      ordersChangePct: 0,
      totalCustomers: 0,
      averageOrderValuePaise: 0,
      pendingOrders: 0,
      cancelledOrders: 0,
      refundedPaise: 0,
      totalInventoryAvailable: 0,
      lowStockVariants: 0,
      grossSalesPaise: 0,
      discountsImpactPaise: 0,
      returningCustomerRatePct: 0,
      paymentSuccessRatePct: 0,
    },
    revenueSeries: [],
    paymentMethodBreakdown: [],
    orderStatusBreakdown: [],
  };

  if (!isServiceRoleConfigured()) return empty;

  const admin = createAdminSupabaseClient();

  const [ordersRes, prevOrdersRes, customersRes, inventoryRes, refundsRes, paymentsRes] =
    await Promise.all([
      admin
        .from('orders')
        .select(
          'id, customer_email, subtotal_paise, offer_discount_paise, coupon_discount_paise, total_paise, payment_method, payment_status, order_status, created_at'
        )
        .gte('created_at', window.start.toISOString())
        .lte('created_at', window.end.toISOString())
        .order('created_at', { ascending: true }),
      admin
        .from('orders')
        .select('id, total_paise, order_status, payment_status')
        .gte('created_at', window.prevStart.toISOString())
        .lt('created_at', window.prevEnd.toISOString()),
      admin.from('profiles').select('id', { count: 'exact', head: true }),
      admin.from('inventory').select('stock_on_hand, stock_reserved, low_stock_threshold'),
      admin
        .from('refunds')
        .select('amount_paise, status')
        .gte('created_at', window.start.toISOString()),
      admin
        .from('payments')
        .select('status')
        .gte('created_at', window.start.toISOString()),
    ]);

  const orders = ordersRes.data ?? [];
  const prevOrders = prevOrdersRes.data ?? [];

  const revenueOrders = orders.filter(
    (o) =>
      o.order_status !== 'cancelled' &&
      (o.payment_status === 'paid' || o.payment_status === 'cod_pending_collection')
  );
  const prevRevenueOrders = prevOrders.filter(
    (o) =>
      o.order_status !== 'cancelled' &&
      (o.payment_status === 'paid' || o.payment_status === 'cod_pending_collection')
  );

  const totalRevenuePaise = revenueOrders.reduce((s, o) => s + o.total_paise, 0);
  const prevRevenuePaise = prevRevenueOrders.reduce((s, o) => s + o.total_paise, 0);
  const grossSalesPaise = revenueOrders.reduce((s, o) => s + o.subtotal_paise, 0);
  const discountsImpactPaise = revenueOrders.reduce(
    (s, o) => s + o.offer_discount_paise + o.coupon_discount_paise,
    0
  );

  const pendingOrders = orders.filter((o) =>
    ['pending', 'confirmed', 'processing'].includes(o.order_status)
  ).length;
  const cancelledOrders = orders.filter((o) => o.order_status === 'cancelled').length;
  const refundedPaise = (refundsRes.data ?? [])
    .filter((r) => r.status === 'succeeded')
    .reduce((s, r) => s + r.amount_paise, 0);

  const inventoryRows = inventoryRes.data ?? [];
  const totalInventoryAvailable = inventoryRows.reduce(
    (s, row) => s + Math.max(0, row.stock_on_hand - row.stock_reserved),
    0
  );
  const lowStockVariants = inventoryRows.filter(
    (row) => row.stock_on_hand - row.stock_reserved <= row.low_stock_threshold
  ).length;

  // Returning customer rate from real orders
  const emailCounts = new Map<string, number>();
  for (const o of orders) {
    emailCounts.set(o.customer_email, (emailCounts.get(o.customer_email) ?? 0) + 1);
  }
  const uniqueCustomers = emailCounts.size;
  const returningCustomers = Array.from(emailCounts.values()).filter((c) => c > 1).length;
  const returningCustomerRatePct =
    uniqueCustomers > 0 ? Math.round((returningCustomers / uniqueCustomers) * 1000) / 10 : 0;

  // Payment success rate
  const paymentRows = paymentsRes.data ?? [];
  const paidPayments = paymentRows.filter(
    (p) => p.status === 'paid' || p.status === 'cod_pending_collection'
  ).length;
  const paymentSuccessRatePct =
    paymentRows.length > 0 ? Math.round((paidPayments / paymentRows.length) * 1000) / 10 : 0;

  // Daily time series grouped in Asia/Kolkata date labels
  const dailyMap = new Map<string, { revenuePaise: number; orders: number }>();
  for (const o of orders) {
    const dayKey = new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: 'short',
    }).format(new Date(o.created_at));
    const entry = dailyMap.get(dayKey) ?? { revenuePaise: 0, orders: 0 };
    entry.orders += 1;
    if (
      o.order_status !== 'cancelled' &&
      (o.payment_status === 'paid' || o.payment_status === 'cod_pending_collection')
    ) {
      entry.revenuePaise += o.total_paise;
    }
    dailyMap.set(dayKey, entry);
  }

  const revenueSeries = Array.from(dailyMap.entries()).map(([date, val]) => ({
    date,
    revenueRupees: Math.round(val.revenuePaise / 100),
    orders: val.orders,
  }));

  // Payment method distribution
  const methodMap = new Map<string, { count: number; revenuePaise: number }>();
  for (const o of orders) {
    const entry = methodMap.get(o.payment_method) ?? { count: 0, revenuePaise: 0 };
    entry.count += 1;
    entry.revenuePaise += o.total_paise;
    methodMap.set(o.payment_method, entry);
  }
  const paymentMethodBreakdown = Array.from(methodMap.entries()).map(([method, v]) => ({
    method: method.replaceAll('_', ' ').toUpperCase(),
    count: v.count,
    revenueRupees: Math.round(v.revenuePaise / 100),
  }));

  // Order status distribution
  const statusMap = new Map<string, number>();
  for (const o of orders) {
    statusMap.set(o.order_status, (statusMap.get(o.order_status) ?? 0) + 1);
  }
  const orderStatusBreakdown = Array.from(statusMap.entries()).map(([status, count]) => ({
    status: status.replaceAll('_', ' '),
    count,
  }));

  return {
    rangeLabel: window.label,
    kpis: {
      totalRevenuePaise,
      prevRevenuePaise,
      revenueChangePct: pctChange(totalRevenuePaise, prevRevenuePaise),
      totalOrders: orders.length,
      prevOrders: prevOrders.length,
      ordersChangePct: pctChange(orders.length, prevOrders.length),
      totalCustomers: customersRes.count ?? 0,
      averageOrderValuePaise:
        revenueOrders.length > 0 ? Math.round(totalRevenuePaise / revenueOrders.length) : 0,
      pendingOrders,
      cancelledOrders,
      refundedPaise,
      totalInventoryAvailable,
      lowStockVariants,
      grossSalesPaise,
      discountsImpactPaise,
      returningCustomerRatePct,
      paymentSuccessRatePct,
    },
    revenueSeries,
    paymentMethodBreakdown,
    orderStatusBreakdown,
  };
}

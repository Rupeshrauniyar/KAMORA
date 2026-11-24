'use client';

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
} from 'recharts';

interface RevenueChartsProps {
  revenueSeries: { date: string; revenueRupees: number; orders: number }[];
  paymentMethodBreakdown: { method: string; count: number; revenueRupees: number }[];
  orderStatusBreakdown: { status: string; count: number }[];
}

export function RevenueCharts({
  revenueSeries,
  paymentMethodBreakdown,
  orderStatusBreakdown,
}: RevenueChartsProps) {
  const hasData = revenueSeries.length > 0;

  return (
    <div className="grid gap-6 lg:grid-cols-12">
      {/* Revenue & Orders Trend */}
      <div className="rounded-[20px] border border-[#E6E3DC] bg-white p-6 shadow-soft lg:col-span-8">
        <h2 className="font-heading text-base font-bold text-[#11151B]">
          Revenue Trend (INR)
        </h2>
        <p className="text-xs text-[#5C636E]">
          Live aggregated revenue from confirmed paid &amp; COD orders in PostgreSQL.
        </p>

        {hasData ? (
          <div className="mt-5 h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueSeries}>
                <defs>
                  <linearGradient id="kamoraBlueFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0E1116" stopOpacity={0.22} />
                    <stop offset="95%" stopColor="#B89768" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E6E3DC" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#5C636E' }} />
                <YAxis tick={{ fontSize: 11, fill: '#5C636E' }} />
                <Tooltip
                  formatter={(value: number) => [`₹${value.toLocaleString('en-IN')}`, 'Revenue']}
                />
                <Area
                  type="monotone"
                  dataKey="revenueRupees"
                  stroke="#0E1116"
                  strokeWidth={2}
                  fill="url(#kamoraBlueFill)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="mt-6 flex h-64 items-center justify-center rounded-[14px] border border-dashed border-[#E6E3DC] bg-[#FAFAF8] text-center text-xs text-[#5C636E]">
            No completed order data in the selected date window yet. Real sales data will
            appear here automatically once orders are placed.
          </div>
        )}
      </div>

      {/* Payment & Status Breakdown */}
      <div className="space-y-6 lg:col-span-4">
        <div className="rounded-[20px] border border-[#E6E3DC] bg-white p-6 shadow-soft">
          <h2 className="font-heading text-base font-bold text-[#11151B]">
            Payment Methods
          </h2>
          {paymentMethodBreakdown.length > 0 ? (
            <div className="mt-4 h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={paymentMethodBreakdown}>
                  <XAxis dataKey="method" tick={{ fontSize: 10, fill: '#647B8D' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#647B8D' }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#0E1116" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="mt-4 text-xs text-[#5C636E]">No payment records in this period.</p>
          )}
        </div>

        <div className="rounded-[20px] border border-[#E6E3DC] bg-white p-6 shadow-soft">
          <h2 className="font-heading text-base font-bold text-[#11151B]">
            Order Status Distribution
          </h2>
          {orderStatusBreakdown.length > 0 ? (
            <ul className="mt-4 space-y-2 text-xs">
              {orderStatusBreakdown.map((row) => (
                <li
                  key={row.status}
                  className="flex items-center justify-between rounded-[10px] bg-[#FAFAF8] px-3 py-2"
                >
                  <span className="capitalize text-[#11151B]">{row.status}</span>
                  <span className="font-bold text-[#1C3D5A]">{row.count}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-xs text-[#5C636E]">No orders recorded in this period.</p>
          )}
        </div>
      </div>
    </div>
  );
}

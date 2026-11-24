'use client';

import * as React from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  flexRender,
  createColumnHelper,
  type SortingState,
} from '@tanstack/react-table';
import { Download, Search, Eye, ArrowUpDown, RefreshCcw } from 'lucide-react';
import type { OrderRecord } from '@/types/database';
import { formatISTDateTime, formatPaise } from '@/lib/utils/format';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input, Select, Textarea } from '@/components/ui/card';
import { ModalDialog } from '@/components/ui/dialog';
import { updateOrderAction, processStripeRefundAction } from '@/actions/admin/mutations';

const columnHelper = createColumnHelper<OrderRecord>();

export function OrdersTable({ orders }: { orders: OrderRecord[] }) {
  const [globalFilter, setGlobalFilter] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState('all');
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [selectedOrder, setSelectedOrder] = React.useState<OrderRecord | null>(null);
  const [actionMessage, setActionMessage] = React.useState('');

  const filteredData = React.useMemo(() => {
    return orders.filter((o) => {
      if (statusFilter !== 'all' && o.order_status !== statusFilter) return false;
      if (!globalFilter.trim()) return true;
      const q = globalFilter.toLowerCase();
      return (
        o.order_number.toLowerCase().includes(q) ||
        o.customer_name.toLowerCase().includes(q) ||
        o.customer_phone.toLowerCase().includes(q) ||
        o.customer_email.toLowerCase().includes(q)
      );
    });
  }, [orders, statusFilter, globalFilter]);

  const columns = React.useMemo(
    () => [
      columnHelper.accessor('order_number', {
        header: 'Order ID',
        cell: (info) => (
          <span className="font-heading font-semibold text-[#11151B]">{info.getValue()}</span>
        ),
      }),
      columnHelper.accessor('customer_name', {
        header: 'Customer',
        cell: (info) => (
          <div>
            <p className="font-medium text-[#11151B]">{info.getValue()}</p>
            <p className="text-xs text-[#5C636E]">{info.row.original.customer_phone}</p>
          </div>
        ),
      }),
      columnHelper.accessor('total_paise', {
        header: 'Order Value',
        cell: (info) => (
          <span className="font-semibold text-[#11151B]">{formatPaise(info.getValue())}</span>
        ),
      }),
      columnHelper.accessor('payment_method', {
        header: 'Payment',
        cell: (info) => (
          <div className="space-y-1">
            <span className="block text-xs uppercase text-[#5C636E]">
              {info.getValue().replaceAll('_', ' ')}
            </span>
            <Badge
              variant={
                info.row.original.payment_status === 'paid'
                  ? 'success'
                  : info.row.original.payment_status === 'failed'
                  ? 'danger'
                  : 'default'
              }
            >
              {info.row.original.payment_status.replaceAll('_', ' ')}
            </Badge>
          </div>
        ),
      }),
      columnHelper.accessor('order_status', {
        header: 'Fulfilment',
        cell: (info) => (
          <Badge
            variant={
              info.getValue() === 'delivered'
                ? 'success'
                : info.getValue() === 'cancelled' || info.getValue() === 'returned'
                ? 'danger'
                : 'default'
            }
          >
            {info.getValue().replaceAll('_', ' ')}
          </Badge>
        ),
      }),
      columnHelper.accessor('created_at', {
        header: 'Order Date (IST)',
        cell: (info) => (
          <span className="text-xs text-[#5C636E]">{formatISTDateTime(info.getValue())}</span>
        ),
      }),
      columnHelper.display({
        id: 'actions',
        header: 'Manage',
        cell: (info) => (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setActionMessage('');
              setSelectedOrder(info.row.original);
            }}
          >
            <Eye className="h-3.5 w-3.5" />
            Details
          </Button>
        ),
      }),
    ],
    []
  );

  const table = useReactTable({
    data: filteredData,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  function exportCsv() {
    const header = [
      'Order Number',
      'Customer',
      'Email',
      'Phone',
      'Total INR',
      'Payment Method',
      'Payment Status',
      'Order Status',
      'Created At',
    ];
    const rows = filteredData.map((o) => [
      o.order_number,
      o.customer_name,
      o.customer_email,
      o.customer_phone,
      (o.total_paise / 100).toFixed(2),
      o.payment_method,
      o.payment_status,
      o.order_status,
      o.created_at,
    ]);
    const csv = [header, ...rows]
      .map((r) => r.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kamora-orders-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-1 flex-wrap items-center gap-2.5">
          <div className="relative min-w-[220px] flex-1 max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#5C636E]" />
            <Input
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              placeholder="Search order ID, name, phone..."
              className="pl-9"
            />
          </div>
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-44"
            aria-label="Filter by order status"
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="processing">Processing</option>
            <option value="shipped">Shipped</option>
            <option value="out_for_delivery">Out for Delivery</option>
            <option value="delivered">Delivered</option>
            <option value="cancelled">Cancelled</option>
            <option value="returned">Returned</option>
          </Select>
        </div>

        <Button variant="secondary" size="sm" onClick={exportCsv}>
          <Download className="h-4 w-4" />
          Export CSV ({filteredData.length})
        </Button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-[18px] border border-[#E6E3DC] bg-white shadow-soft">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-[#E6E3DC] bg-[#FAFAF8] text-xs uppercase tracking-wider text-[#5C636E]">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((header) => (
                  <th key={header.id} className="px-4 py-3.5 font-semibold">
                    <button
                      type="button"
                      onClick={header.column.getToggleSortingHandler()}
                      className="inline-flex items-center gap-1 cursor-pointer"
                    >
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {header.column.getCanSort() && (
                        <ArrowUpDown className="h-3 w-3 opacity-50" />
                      )}
                    </button>
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-[#E6E3DC]">
            {table.getRowModel().rows.length > 0 ? (
              table.getRowModel().rows.map((row) => (
                <tr key={row.id} className="hover:bg-[#FAFAF8]/70">
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-3.5">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length} className="px-4 py-10 text-center text-sm text-[#5C636E]">
                  No orders found matching your current filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between text-xs text-[#5C636E]">
        <span>
          Page {table.getState().pagination.pageIndex + 1} of{' '}
          {Math.max(1, table.getPageCount())}
        </span>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            disabled={!table.getCanPreviousPage()}
            onClick={() => table.previousPage()}
          >
            Previous
          </Button>
          <Button
            variant="secondary"
            size="sm"
            disabled={!table.getCanNextPage()}
            onClick={() => table.nextPage()}
          >
            Next
          </Button>
        </div>
      </div>

      {/* Order Detail & Fulfilment Modal */}
      <ModalDialog
        open={Boolean(selectedOrder)}
        onClose={() => setSelectedOrder(null)}
        title={selectedOrder ? `Manage Order ${selectedOrder.order_number}` : 'Order'}
        description={
          selectedOrder
            ? `${selectedOrder.customer_name} · ${selectedOrder.customer_phone} · ${formatPaise(selectedOrder.total_paise)}`
            : undefined
        }
        size="lg"
      >
        {selectedOrder && (
          <div className="space-y-6">
            <div className="rounded-[14px] border border-[#E6E3DC] bg-[#FAFAF8] p-4 text-xs">
              <p className="font-semibold text-[#11151B]">Delivery Address</p>
              <p className="mt-1 text-[#5C636E]">
                {selectedOrder.shipping_address.address_line1},{' '}
                {selectedOrder.shipping_address.city}, {selectedOrder.shipping_address.state} –{' '}
                {selectedOrder.shipping_address.pincode}
              </p>
              <ul className="mt-3 space-y-1 border-t border-[#E6E3DC] pt-2.5 text-[#11151B]">
                {(selectedOrder.items ?? []).map((item) => (
                  <li key={item.id} className="flex justify-between">
                    <span>
                      {item.product_name} ({item.variant_label}) × {item.quantity}
                    </span>
                    <span className="font-semibold">{formatPaise(item.line_total_paise)}</span>
                  </li>
                ))}
              </ul>
            </div>

            <form
              action={async (fd) => {
                const res = await updateOrderAction(fd);
                setActionMessage(res.error ?? 'Order updated successfully.');
              }}
              className="space-y-4"
            >
              <input type="hidden" name="order_id" value={selectedOrder.id} />
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold">Order Status</label>
                  <Select name="order_status" defaultValue={selectedOrder.order_status}>
                    <option value="pending">Pending</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="processing">Processing</option>
                    <option value="shipped">Shipped</option>
                    <option value="out_for_delivery">Out for Delivery</option>
                    <option value="delivered">Delivered</option>
                    <option value="cancelled">Cancelled (Restores Stock)</option>
                    <option value="returned">Returned (Restores Stock)</option>
                  </Select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold">Courier Partner</label>
                  <Input
                    name="courier_name"
                    defaultValue={selectedOrder.shipment?.courier_name ?? ''}
                    placeholder="e.g. Delhivery / BlueDart"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold">Tracking Number (AWB)</label>
                  <Input
                    name="tracking_number"
                    defaultValue={selectedOrder.shipment?.tracking_number ?? ''}
                    placeholder="AWB123456789"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold">Tracking URL</label>
                  <Input
                    name="tracking_url"
                    defaultValue={selectedOrder.shipment?.tracking_url ?? ''}
                    placeholder="https://..."
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold">Internal Notes</label>
                <Textarea
                  name="internal_notes"
                  defaultValue={selectedOrder.internal_notes ?? ''}
                  className="min-h-[70px]"
                />
              </div>

              <Button type="submit" variant="primary">
                Save Fulfilment Update
              </Button>
            </form>

            {selectedOrder.payment_status === 'paid' && (
              <form
                action={async (fd) => {
                  const res = await processStripeRefundAction(fd);
                  setActionMessage(res.error ?? 'Stripe refund initiated.');
                }}
                className="border-t border-[#E6E3DC] pt-4"
              >
                <input type="hidden" name="order_id" value={selectedOrder.id} />
                <input type="hidden" name="reason" value="Admin initiated refund" />
                <Button type="submit" variant="danger" size="sm">
                  <RefreshCcw className="h-3.5 w-3.5" />
                  Issue Full Stripe Refund ({formatPaise(selectedOrder.total_paise)})
                </Button>
              </form>
            )}

            {actionMessage && (
              <p className="text-xs font-semibold text-[#1C3D5A]">{actionMessage}</p>
            )}
          </div>
        )}
      </ModalDialog>
    </div>
  );
}

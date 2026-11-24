'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Package,
  Boxes,
  ShoppingCart,
  Users,
  Sparkles,
  Tag,
  Star,
  FileText,
  Truck,
  BarChart3,
  Settings,
  Menu,
  X,
  ExternalLink,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import type { AdminContext } from '@/lib/auth/admin';
import { cn } from '@/lib/utils/format';
import { Badge } from '@/components/ui/badge';

const ADMIN_NAV = [
  { label: 'Overview', href: '/admin', icon: LayoutDashboard },
  { label: 'Orders', href: '/admin/orders', icon: ShoppingCart },
  { label: 'Products', href: '/admin/products', icon: Package },
  { label: 'Inventory', href: '/admin/inventory', icon: Boxes },
  { label: 'Customers', href: '/admin/customers', icon: Users },
  { label: 'Offers', href: '/admin/offers', icon: Sparkles },
  { label: 'Discounts', href: '/admin/discounts', icon: Tag },
  { label: 'Reviews', href: '/admin/reviews', icon: Star },
  { label: 'Content', href: '/admin/content', icon: FileText },
  { label: 'Shipping', href: '/admin/shipping', icon: Truck },
  { label: 'Analytics', href: '/admin/analytics', icon: BarChart3 },
  { label: 'Settings', href: '/admin/settings', icon: Settings },
];

export function AdminShell({
  admin,
  children,
}: {
  admin: AdminContext;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);

  const currentNav =
    ADMIN_NAV.find((item) =>
      item.href === '/admin' ? pathname === '/admin' : pathname.startsWith(item.href)
    ) ?? ADMIN_NAV[0]!;

  return (
    <div className="flex min-h-screen bg-[#FAFAF8] text-[#11151B]">
      {/* Desktop Collapsible Sidebar */}
      <aside
        className={cn(
          'hidden shrink-0 flex-col border-r border-[#E6E3DC] bg-white transition-all duration-200 lg:flex',
          collapsed ? 'w-[76px]' : 'w-64'
        )}
      >
        <div className="flex h-16 items-center justify-between border-b border-[#E6E3DC] px-4">
          <Link href="/admin" className="flex items-center gap-2.5 overflow-hidden">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] bg-[#0E1116] font-heading text-base font-bold text-white">
              K
            </span>
            {!collapsed && (
              <div className="truncate">
                <p className="font-heading text-base font-bold text-[#11151B]">Kamora</p>
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#1C3D5A]">
                  Control Centre
                </p>
              </div>
            )}
          </Link>
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="rounded-lg p-1.5 text-[#5C636E] hover:bg-[#F2F0EB] hover:text-[#11151B] cursor-pointer"
          >
            {collapsed ? (
              <PanelLeftOpen className="h-4 w-4" />
            ) : (
              <PanelLeftClose className="h-4 w-4" />
            )}
          </button>
        </div>

        <nav aria-label="Admin navigation" className="flex-1 space-y-1 overflow-y-auto p-3">
          {ADMIN_NAV.map((item) => {
            const active =
              item.href === '/admin'
                ? pathname === '/admin'
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                title={collapsed ? item.label : undefined}
                className={cn(
                  'flex items-center gap-3 rounded-[11px] px-3 py-2.5 text-sm font-medium transition',
                  active
                    ? 'bg-[#F2F0EB] text-[#1C3D5A]'
                    : 'text-[#5C636E] hover:bg-[#FAFAF8] hover:text-[#11151B]'
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-[#E6E3DC] p-3">
          <Link
            href="/"
            className="flex items-center justify-center gap-2 rounded-[11px] border border-[#E6E3DC] bg-[#FAFAF8] px-3 py-2 text-xs font-semibold text-[#11151B] hover:border-[#0E1116]/30"
          >
            <ExternalLink className="h-3.5 w-3.5 text-[#1C3D5A]" />
            {!collapsed && <span>View Storefront</span>}
          </Link>
        </div>
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-[#243746]/40"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative flex h-full w-64 flex-col bg-white shadow-elevated">
            <div className="flex h-16 items-center justify-between border-b border-[#E6E3DC] px-4">
              <span className="font-heading text-base font-bold text-[#11151B]">
                Kamora Admin
              </span>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                aria-label="Close admin menu"
                className="rounded-lg p-1.5 text-[#5C636E]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <nav className="flex-1 space-y-1 overflow-y-auto p-3">
              {ADMIN_NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    'flex items-center gap-3 rounded-[11px] px-3 py-2.5 text-sm font-medium',
                    pathname === item.href
                      ? 'bg-[#F2F0EB] text-[#1C3D5A]'
                      : 'text-[#5C636E]'
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Link>
              ))}
            </nav>
          </div>
        </div>
      )}

      {/* Main Column */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-[#E6E3DC] bg-white/95 px-4 backdrop-blur-md sm:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label="Open admin sidebar"
              className="rounded-lg border border-[#E6E3DC] p-2 text-[#11151B] lg:hidden"
            >
              <Menu className="h-4 w-4" />
            </button>
            <div>
              <p className="text-[11px] font-medium text-[#5C636E]">
                Admin / {currentNav.label}
              </p>
              <h1 className="font-heading text-base font-bold text-[#11151B]">
                {currentNav.label}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Badge variant="default">{admin.role.replaceAll('_', ' ')}</Badge>
            <span className="hidden text-xs font-medium text-[#5C636E] sm:inline">
              {admin.fullName ?? admin.email}
            </span>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}

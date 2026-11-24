'use client';

import * as React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  Menu,
  Search,
  ShoppingBag,
  User,
  X,
  ArrowUpRight,
  Minus,
  Plus,
  Trash2,
} from 'lucide-react';
import { AnimatePresence, motion, MotionConfig } from 'framer-motion';
import { useCart } from '@/components/cart/cart-provider';
import { useAuth } from '@/components/auth/auth-provider';
import { ModalDialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn, formatPaise } from '@/lib/utils/format';

const NAV_LINKS = [
  { label: 'Belt', href: '/products/back-support-belt' },
  { label: 'Architecture', href: '/#engineering' },
  { label: 'Benefits', href: '/#benefits' },
  { label: 'Comfort Kit', href: '/#comfort-kit' },
  { label: 'Journal', href: '/blog' },
  { label: 'About', href: '/about' },
];

const SEARCH_SUGGESTIONS = [
  {
    title: 'Kamora Adjustable Back Support Belt',
    category: 'Flagship Product',
    href: '/products/back-support-belt',
    keywords: 'belt lumbar back support orthopedic posture brace compression',
  },
  {
    title: 'The Complete Back Comfort Kit',
    category: 'Launch Edition',
    href: '/products/back-support-belt#comfort-kit',
    keywords: 'kit pouch bundle offer discount family addon',
  },
  {
    title: 'Interactive Size Guide & Waist Calculator',
    category: 'Sizing & Fit',
    href: '/products/back-support-belt#size-guide',
    keywords: 'size guide waist measurement inches cm small medium large xl xxl',
  },
  {
    title: 'Track Your Order',
    category: 'Order Support',
    href: '/track-order',
    keywords: 'track order delivery status shipping courier',
  },
  {
    title: 'Frequently Asked Questions',
    category: 'Help Centre',
    href: '/faq',
    keywords: 'faq wash care return exchange cod payment delivery',
  },
  {
    title: 'Understanding Everyday Lumbar Support',
    category: 'Wellness Journal',
    href: '/blog/understanding-everyday-lumbar-support',
    keywords: 'journal blog lumbar spine desk travel posture',
  },
];

export function Navbar({ brandName = 'Kamora' }: { brandName?: string }) {
  const pathname = usePathname();
  const { user, isAdmin } = useAuth();
  const {
    items,
    totalQuantity,
    subtotalPaise,
    isDrawerOpen,
    openDrawer,
    closeDrawer,
    updateQuantity,
    removeItem,
  } = useCart();

  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');

  React.useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const filteredSuggestions = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return SEARCH_SUGGESTIONS;
    return SEARCH_SUGGESTIONS.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        item.keywords.includes(q)
    );
  }, [query]);

  return (
    <MotionConfig reducedMotion="user">
      <header className="sticky top-0 z-40 border-b border-[#E6E3DC]/90 bg-[#FAFAF8]/85 backdrop-blur-xl">
        <div className="mx-auto flex h-[74px] max-w-[1380px] items-center justify-between gap-6 px-4 sm:px-8">
          {/* Left: Mobile trigger + Architectural Wordmark */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open navigation menu"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#E6E3DC] bg-white text-[#11151B] transition hover:border-[#11151B] lg:hidden cursor-pointer"
            >
              <Menu className="h-4 w-4" />
            </button>

            <Link href="/" className="group flex items-baseline gap-2.5">
              <span className="font-heading text-[21px] font-semibold tracking-[-0.04em] text-[#0E1116]">
                {brandName.toUpperCase()}
              </span>
              <span className="hidden h-1.5 w-1.5 rounded-full bg-[#B89768] sm:inline-block" />
              <span className="font-mono-tech hidden text-[10px] text-[#8A9099] xl:inline-block">
                LUMBAR STUDIO
              </span>
            </Link>
          </div>

          {/* Center: Minimalist Architectural Nav */}
          <nav
            aria-label="Primary navigation"
            className="hidden items-center gap-1 rounded-full border border-[#E6E3DC] bg-white/80 px-2 py-1.5 shadow-[0_1px_2px_rgba(14,17,22,0.03)] lg:flex"
          >
            {NAV_LINKS.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'rounded-full px-4 py-1.5 text-[13px] font-medium tracking-[-0.01em] transition',
                    active
                      ? 'bg-[#0E1116] text-white'
                      : 'text-[#5C636E] hover:text-[#0E1116]'
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Right: Search, Account, Cart Pill */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              aria-label="Search store"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full text-[#11151B] transition hover:bg-[#F2F0EB] cursor-pointer"
            >
              <Search className="h-[18px] w-[18px]" />
            </button>

            {isAdmin && (
              <Link
                href="/admin"
                prefetch={false}
                className="inline-flex h-9 items-center rounded-full border border-[#B89768]/50 bg-[#B89768]/15 px-3.5 text-xs font-semibold text-[#86683D] transition hover:bg-[#B89768]/25"
              >
                Admin
              </Link>
            )}

            <Link
              href={user ? '/account' : '/login'}
              prefetch={false}
              aria-label={user ? 'Customer account' : 'Sign in'}
              className="inline-flex h-10 items-center justify-center gap-1.5 rounded-full px-2.5 text-[#11151B] transition hover:bg-[#F2F0EB]"
            >
              {user ? (
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#1C3D5A] text-[11px] font-semibold text-white">
                  {(user.full_name || user.email || 'K').slice(0, 2).toUpperCase()}
                </span>
              ) : (
                <User className="h-[18px] w-[18px]" />
              )}
            </Link>

            <button
              type="button"
              onClick={openDrawer}
              aria-label={`Open shopping bag with ${totalQuantity} items`}
              className="inline-flex h-10 items-center gap-2 rounded-full bg-[#0E1116] px-4 text-xs font-medium text-white transition hover:bg-[#1E242E] cursor-pointer"
            >
              <ShoppingBag className="h-3.5 w-3.5 text-[#D6BA8E]" />
              <span className="hidden sm:inline">Bag</span>
              <span className="font-mono-tech text-[11px] text-white/90">
                ({totalQuantity})
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Navigation Drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <div
            className="fixed inset-0 z-50 lg:hidden"
            role="dialog"
            aria-modal="true"
            aria-label="Mobile navigation"
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileMenuOpen(false)}
              className="absolute inset-0 bg-[#0E1116]/50 backdrop-blur-sm"
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="relative flex h-full w-[84%] max-w-xs flex-col bg-[#FAFAF8] shadow-elevated"
            >
              <div className="flex items-center justify-between border-b border-[#E6E3DC] px-6 py-5">
                <span className="font-heading text-lg font-semibold tracking-[-0.04em] text-[#0E1116]">
                  {brandName.toUpperCase()}
                </span>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  aria-label="Close navigation menu"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#E6E3DC] text-[#5C636E] cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <nav className="flex-1 space-y-1 overflow-y-auto px-5 py-6">
                {NAV_LINKS.map((item, idx) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-between border-b border-[#E6E3DC]/70 py-3.5 text-base font-medium text-[#11151B]"
                  >
                    <span className="flex items-center gap-3">
                      <span className="font-mono-tech text-[10px] text-[#8A9099]">
                        0{idx + 1}
                      </span>
                      {item.label}
                    </span>
                    <ArrowUpRight className="h-4 w-4 text-[#8A9099]" />
                  </Link>
                ))}
                <div className="pt-5 space-y-2 text-sm text-[#5C636E]">
                  <Link
                    href="/track-order"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block py-1.5 hover:text-[#0E1116]"
                  >
                    Track Order
                  </Link>
                  <Link
                    href="/faq"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block py-1.5 hover:text-[#0E1116]"
                  >
                    FAQ &amp; Sizing Help
                  </Link>
                  <Link
                    href="/contact"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block py-1.5 hover:text-[#0E1116]"
                  >
                    Contact Care
                  </Link>
                </div>
              </nav>
              <div className="border-t border-[#E6E3DC] p-5">
                <Link
                  href="/products/back-support-belt"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Button variant="primary" size="lg" className="w-full">
                    Configure Your Belt
                  </Button>
                </Link>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Instant Search Modal */}
      <ModalDialog
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        title="Search Kamora"
        description="Jump directly to sizing, product architecture, tracking, or care guides."
        size="md"
      >
        <div className="space-y-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8A9099]" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search waist sizing, comfort kit, tracking, care..."
              autoFocus
              className="h-12 w-full rounded-[14px] border border-[#E6E3DC] bg-white pl-10 pr-4 text-sm text-[#11151B] focus:border-[#0E1116] focus:outline-none"
            />
          </div>

          <div className="divide-y divide-[#E6E3DC] overflow-hidden rounded-[16px] border border-[#E6E3DC] bg-white">
            {filteredSuggestions.length > 0 ? (
              filteredSuggestions.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setSearchOpen(false)}
                  className="flex items-center justify-between px-4 py-3.5 transition hover:bg-[#F2F0EB]/60"
                >
                  <div>
                    <p className="text-sm font-medium text-[#11151B]">{item.title}</p>
                    <p className="font-mono-tech mt-0.5 text-[10px] text-[#8A9099]">
                      {item.category}
                    </p>
                  </div>
                  <ArrowUpRight className="h-4 w-4 text-[#8A9099]" />
                </Link>
              ))
            ) : (
              <p className="px-4 py-6 text-center text-sm text-[#5C636E]">
                No matches found. Try searching &ldquo;size&rdquo;, &ldquo;kit&rdquo;, or &ldquo;track&rdquo;.
              </p>
            )}
          </div>
        </div>
      </ModalDialog>

      {/* Slide-Over Shopping Bag Drawer */}
      <AnimatePresence>
        {isDrawerOpen && (
          <div
            className="fixed inset-0 z-50 flex justify-end"
            role="dialog"
            aria-modal="true"
            aria-label="Shopping bag"
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeDrawer}
              className="absolute inset-0 bg-[#0E1116]/50 backdrop-blur-sm"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 32, stiffness: 300 }}
              className="relative flex h-full w-full max-w-md flex-col bg-[#FAFAF8] shadow-elevated"
            >
              <div className="flex items-center justify-between border-b border-[#E6E3DC] bg-white px-6 py-5">
                <div>
                  <p className="font-mono-tech text-[10px] text-[#8A9099]">SHOPPING BAG</p>
                  <h2 className="mt-0.5 font-heading text-lg font-semibold text-[#11151B]">
                    {totalQuantity} {totalQuantity === 1 ? 'Item' : 'Items'} Selected
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={closeDrawer}
                  aria-label="Close shopping bag"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#E6E3DC] text-[#5C636E] hover:border-[#11151B] hover:text-[#11151B] cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-6 py-5">
                {items.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center text-center">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full border border-[#E6E3DC] bg-white text-[#11151B]">
                      <ShoppingBag className="h-5 w-5" />
                    </div>
                    <h3 className="mt-4 font-heading text-base font-semibold text-[#11151B]">
                      Your bag is empty
                    </h3>
                    <p className="mt-1.5 max-w-xs text-sm text-[#5C636E]">
                      Select your waist size on the Kamora Back Support Belt to unlock the
                      Complete Comfort Kit.
                    </p>
                    <Link
                      href="/products/back-support-belt"
                      onClick={closeDrawer}
                      className="mt-6"
                    >
                      <Button variant="primary">Explore Back Support Belt</Button>
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {totalQuantity === 1 && (
                      <div className="rounded-[16px] border border-[#B89768]/35 bg-[#B89768]/10 px-4 py-3 text-xs text-[#11151B]">
                        <span className="font-mono-tech block text-[10px] text-[#86683D]">
                          FAMILY COMFORT ADD-ON
                        </span>
                        <p className="mt-1">
                          Add a second belt in any size to save <strong>₹400</strong> automatically.
                        </p>
                      </div>
                    )}

                    {items.map((item) => (
                      <div
                        key={item.variant_id}
                        className="flex gap-4 rounded-[18px] border border-[#E6E3DC] bg-white p-3.5"
                      >
                        <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-[12px] bg-[#F2F0EB]">
                          <Image
                            src={item.image_url}
                            alt={item.product_name}
                            fill
                            sizes="80px"
                            className="object-cover"
                          />
                        </div>
                        <div className="flex flex-1 flex-col justify-between">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="text-sm font-semibold text-[#11151B]">
                                {item.product_name}
                              </p>
                              <p className="font-mono-tech mt-0.5 text-[10px] text-[#8A9099]">
                                {item.size_label}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => void removeItem(item.variant_id)}
                              aria-label={`Remove ${item.size_label}`}
                              className="text-[#8A9099] transition hover:text-rose-600 cursor-pointer"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>

                          <div className="mt-3 flex items-center justify-between">
                            <div className="inline-flex items-center rounded-full border border-[#E6E3DC] bg-[#FAFAF8]">
                              <button
                                type="button"
                                onClick={() =>
                                  void updateQuantity(item.variant_id, item.quantity - 1)
                                }
                                aria-label="Decrease quantity"
                                className="px-2.5 py-1 text-[#11151B] hover:bg-[#F2F0EB] rounded-l-full cursor-pointer"
                              >
                                <Minus className="h-3 w-3" />
                              </button>
                              <span className="min-w-7 text-center text-xs font-semibold">
                                {item.quantity}
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  void updateQuantity(item.variant_id, item.quantity + 1)
                                }
                                aria-label="Increase quantity"
                                className="px-2.5 py-1 text-[#11151B] hover:bg-[#F2F0EB] rounded-r-full cursor-pointer"
                              >
                                <Plus className="h-3 w-3" />
                              </button>
                            </div>
                            <p className="text-sm font-semibold text-[#11151B]">
                              {formatPaise(item.unit_price_paise * item.quantity)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {items.length > 0 && (
                <div className="border-t border-[#E6E3DC] bg-white px-6 py-5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[#5C636E]">Subtotal (GST incl.)</span>
                    <span className="font-heading text-lg font-bold text-[#11151B]">
                      {formatPaise(subtotalPaise)}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-[#8A9099]">
                    Campaign discounts &amp; Indian shipping verified server-side at checkout.
                  </p>
                  <div className="mt-4 grid grid-cols-2 gap-2.5">
                    <Link href="/cart" onClick={closeDrawer}>
                      <Button variant="secondary" className="w-full">
                        View Bag
                      </Button>
                    </Link>
                    <Link href="/checkout" onClick={closeDrawer}>
                      <Button variant="primary" className="w-full">
                        Checkout
                      </Button>
                    </Link>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </MotionConfig>
  );
}

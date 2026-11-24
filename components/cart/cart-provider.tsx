'use client';

import * as React from 'react';
import type { CartLineItem } from '@/types/database';

interface CartContextValue {
  items: CartLineItem[];
  totalQuantity: number;
  subtotalPaise: number;
  couponCode: string;
  isLoading: boolean;
  isDrawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  refreshCart: () => Promise<void>;
  addItem: (item: Omit<CartLineItem, 'quantity'>, quantity?: number) => Promise<void>;
  updateQuantity: (variantId: string, quantity: number) => Promise<void>;
  removeItem: (variantId: string) => Promise<void>;
  setCouponCode: (code: string) => void;
  clearCart: () => Promise<void>;
}

const CartContext = React.createContext<CartContextValue | null>(null);
const SESSION_CART_KEY = 'kamora_bag_v1';
const SESSION_COUPON_KEY = 'kamora_coupon_v1';

function readSessionBag(): CartLineItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.sessionStorage.getItem(SESSION_CART_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as CartLineItem[]) : [];
  } catch {
    return [];
  }
}

function writeSessionBag(items: CartLineItem[]) {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(SESSION_CART_KEY, JSON.stringify(items));
  } catch {
    // ignore storage quota errors
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = React.useState<CartLineItem[]>([]);
  const [couponCode, setCouponCodeState] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(true);
  const [isDrawerOpen, setIsDrawerOpen] = React.useState(false);

  const setCouponCode = React.useCallback((code: string) => {
    const cleaned = code.trim().toUpperCase();
    setCouponCodeState(cleaned);
    if (typeof window !== 'undefined') {
      try {
        window.sessionStorage.setItem(SESSION_COUPON_KEY, cleaned);
      } catch {
        // ignore
      }
    }
  }, []);

  const refreshCart = React.useCallback(async () => {
    const localSnapshot = readSessionBag();
    if (localSnapshot.length > 0) {
      setItems(localSnapshot);
    }
    if (typeof window !== 'undefined') {
      const savedCoupon = window.sessionStorage.getItem(SESSION_COUPON_KEY);
      if (savedCoupon) setCouponCodeState(savedCoupon);
    }

    try {
      const res = await fetch('/api/cart', { cache: 'no-store' });
      if (res.ok) {
        const data = (await res.json()) as {
          items?: CartLineItem[];
          coupon_code?: string | null;
          persisted?: boolean;
        };
        if (data.persisted && Array.isArray(data.items) && data.items.length > 0) {
          setItems(data.items);
          writeSessionBag(data.items);
        }
        if (data.coupon_code) {
          setCouponCodeState(data.coupon_code);
        }
      }
    } catch {
      // Keep local snapshot
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void refreshCart();
  }, [refreshCart]);

  const addItem = React.useCallback(
    async (item: Omit<CartLineItem, 'quantity'>, quantity = 1) => {
      setItems((prev) => {
        const idx = prev.findIndex((i) => i.variant_id === item.variant_id);
        let next: CartLineItem[];
        if (idx >= 0) {
          next = [...prev];
          const existing = next[idx]!;
          next[idx] = {
            ...existing,
            quantity: Math.min(20, existing.quantity + quantity),
          };
        } else {
          next = [...prev, { ...item, quantity: Math.min(20, quantity) }];
        }
        writeSessionBag(next);
        return next;
      });
      setIsDrawerOpen(true);

      try {
        const res = await fetch('/api/cart', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            variant_id: item.variant_id,
            product_id: item.product_id,
            quantity,
          }),
        });
        if (res.ok) {
          const data = (await res.json()) as { items?: CartLineItem[]; persisted?: boolean };
          if (data.persisted && Array.isArray(data.items) && data.items.length > 0) {
            setItems(data.items);
            writeSessionBag(data.items);
          }
        }
      } catch {
        // Authoritative price & stock are always verified server-side on quote & checkout
      }
    },
    []
  );

  const updateQuantity = React.useCallback(async (variantId: string, quantity: number) => {
    setItems((prev) => {
      const next =
        quantity <= 0
          ? prev.filter((i) => i.variant_id !== variantId)
          : prev.map((i) =>
              i.variant_id === variantId
                ? { ...i, quantity: Math.min(20, quantity) }
                : i
            );
      writeSessionBag(next);
      return next;
    });

    try {
      const res = await fetch('/api/cart', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ variant_id: variantId, quantity }),
      });
      if (res.ok) {
        const data = (await res.json()) as { items?: CartLineItem[]; persisted?: boolean };
        if (data.persisted && Array.isArray(data.items)) {
          setItems(data.items);
          writeSessionBag(data.items);
        }
      }
    } catch {
      // Optimistic state kept
    }
  }, []);

  const removeItem = React.useCallback(
    async (variantId: string) => {
      await updateQuantity(variantId, 0);
    },
    [updateQuantity]
  );

  const clearCart = React.useCallback(async () => {
    setItems([]);
    setCouponCodeState('');
    writeSessionBag([]);
    if (typeof window !== 'undefined') {
      try {
        window.sessionStorage.removeItem(SESSION_COUPON_KEY);
      } catch {
        // ignore
      }
    }
    try {
      await fetch('/api/cart', { method: 'DELETE' });
    } catch {
      // ignore
    }
  }, []);

  const totalQuantity = React.useMemo(
    () => items.reduce((sum, i) => sum + i.quantity, 0),
    [items]
  );

  const subtotalPaise = React.useMemo(
    () => items.reduce((sum, i) => sum + i.unit_price_paise * i.quantity, 0),
    [items]
  );

  return (
    <CartContext.Provider
      value={{
        items,
        totalQuantity,
        subtotalPaise,
        couponCode,
        isLoading,
        isDrawerOpen,
        openDrawer: () => setIsDrawerOpen(true),
        closeDrawer: () => setIsDrawerOpen(false),
        refreshCart,
        addItem,
        updateQuantity,
        removeItem,
        setCouponCode,
        clearCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = React.useContext(CartContext);
  if (!ctx) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return ctx;
}

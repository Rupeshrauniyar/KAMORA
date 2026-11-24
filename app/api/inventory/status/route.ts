import { NextResponse } from 'next/server';
import {
  createPublicSupabaseClient,
  isPublicSupabaseConfigured,
} from '@/lib/supabase/public';
import { INITIAL_VARIANTS } from '@/lib/data/initial-catalog';

export const dynamic = 'force-dynamic';

export async function GET() {
  if (!isPublicSupabaseConfigured()) {
    return NextResponse.json({
      source: 'fallback',
      variants: INITIAL_VARIANTS.map((v) => ({
        variant_id: v.id,
        size_code: v.size_code,
        size_label: v.size_label,
        stock_on_hand: v.stock_on_hand ?? 0,
        stock_reserved: v.stock_reserved ?? 0,
        available_stock: v.available_stock ?? 0,
        low_stock_threshold: v.low_stock_threshold ?? 10,
        allow_backorder: v.allow_backorder ?? false,
      })),
    });
  }

  try {
    const supabase = createPublicSupabaseClient();
    const { data, error } = await supabase
      .from('product_variants')
      .select('id, size_code, size_label, inventory(stock_on_hand, stock_reserved, low_stock_threshold, allow_backorder)')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (error || !data || data.length === 0) {
      return NextResponse.json({
        source: 'fallback',
        variants: INITIAL_VARIANTS.map((v) => ({
          variant_id: v.id,
          size_code: v.size_code,
          size_label: v.size_label,
          stock_on_hand: v.stock_on_hand ?? 0,
          stock_reserved: v.stock_reserved ?? 0,
          available_stock: v.available_stock ?? 0,
          low_stock_threshold: v.low_stock_threshold ?? 10,
          allow_backorder: v.allow_backorder ?? false,
        })),
      });
    }

    const variants = data.map((row: Record<string, unknown>) => {
      const invRaw = row.inventory;
      const inv = (Array.isArray(invRaw) ? invRaw[0] : invRaw) as
        | {
            stock_on_hand?: number;
            stock_reserved?: number;
            low_stock_threshold?: number;
            allow_backorder?: boolean;
          }
        | undefined;
      const onHand = inv?.stock_on_hand ?? 0;
      const reserved = inv?.stock_reserved ?? 0;
      return {
        variant_id: String(row.id),
        size_code: String(row.size_code),
        size_label: String(row.size_label),
        stock_on_hand: onHand,
        stock_reserved: reserved,
        available_stock: Math.max(0, onHand - reserved),
        low_stock_threshold: inv?.low_stock_threshold ?? 10,
        allow_backorder: inv?.allow_backorder ?? false,
      };
    });

    return NextResponse.json({ source: 'supabase', variants });
  } catch {
    return NextResponse.json({ source: 'fallback', variants: [] });
  }
}

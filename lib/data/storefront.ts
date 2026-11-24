import 'server-only';
import { unstable_cache } from 'next/cache';
import {
  createPublicSupabaseClient,
  isPublicSupabaseConfigured,
} from '@/lib/supabase/public';
import {
  INITIAL_ANNOUNCEMENTS,
  INITIAL_BANNERS,
  INITIAL_BLOG_POSTS,
  INITIAL_FAQS,
  INITIAL_FEATURES,
  INITIAL_IMAGES,
  INITIAL_OFFERS,
  INITIAL_PRODUCT,
  INITIAL_SETTINGS,
  INITIAL_SHIPPING_ZONES,
  INITIAL_SIZE_GUIDES,
  INITIAL_VARIANTS,
} from '@/lib/data/initial-catalog';
import type {
  Announcement,
  Banner,
  BlogPost,
  FAQ,
  Offer,
  Product,
  ProductFeature,
  ProductImage,
  ProductVariant,
  Review,
  ShippingZone,
  SizeGuideEntry,
  StoreSettings,
} from '@/types/database';

export interface FlagshipProductBundle {
  product: Product;
  variants: ProductVariant[];
  images: ProductImage[];
  features: ProductFeature[];
  sizeGuides: SizeGuideEntry[];
  offers: Offer[];
  reviews: Review[];
  averageRating: number | null;
  reviewCount: number;
  isLiveDatabase: boolean;
}

export const getStoreSettings = unstable_cache(
  async (): Promise<StoreSettings> => {
    if (!isPublicSupabaseConfigured()) return INITIAL_SETTINGS;

    try {
      const supabase = createPublicSupabaseClient();
      const { data, error } = await supabase
        .from('store_settings')
        .select('*')
        .eq('setting_key', 'default')
        .maybeSingle();

      if (error || !data) return INITIAL_SETTINGS;
      return data as StoreSettings;
    } catch {
      return INITIAL_SETTINGS;
    }
  },
  ['store-settings'],
  { revalidate: 120, tags: ['store-settings'] }
);

export const getActiveAnnouncements = unstable_cache(
  async (): Promise<Announcement[]> => {
    if (!isPublicSupabaseConfigured()) return INITIAL_ANNOUNCEMENTS;

    try {
      const supabase = createPublicSupabaseClient();
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (error || !data) return INITIAL_ANNOUNCEMENTS;

      const now = Date.now();
      const active = (data as Announcement[]).filter((a) => {
        if (a.starts_at && new Date(a.starts_at).getTime() > now) return false;
        if (a.ends_at && new Date(a.ends_at).getTime() < now) return false;
        return true;
      });

      return active.length > 0 ? active : INITIAL_ANNOUNCEMENTS;
    } catch {
      return INITIAL_ANNOUNCEMENTS;
    }
  },
  ['announcements'],
  { revalidate: 120, tags: ['content'] }
);

export const getBanners = unstable_cache(
  async (): Promise<Record<string, Banner>> => {
    if (!isPublicSupabaseConfigured()) return INITIAL_BANNERS;

    try {
      const supabase = createPublicSupabaseClient();
      const { data, error } = await supabase
        .from('banners')
        .select('*')
        .eq('is_active', true);

      if (error || !data || data.length === 0) return INITIAL_BANNERS;
      const map: Record<string, Banner> = { ...INITIAL_BANNERS };
      for (const row of data as Banner[]) {
        map[row.slot] = row;
      }
      return map;
    } catch {
      return INITIAL_BANNERS;
    }
  },
  ['banners'],
  { revalidate: 120, tags: ['content'] }
);

export const getActiveOffers = unstable_cache(
  async (): Promise<Offer[]> => {
    if (!isPublicSupabaseConfigured()) return INITIAL_OFFERS;

    try {
      const supabase = createPublicSupabaseClient();
      const { data, error } = await supabase
        .from('offers')
        .select('*, items:offer_items(*)')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (error || !data) return INITIAL_OFFERS;

      const now = Date.now();
      const valid = (data as Offer[]).filter((offer) => {
        if (offer.starts_at && new Date(offer.starts_at).getTime() > now) return false;
        if (offer.ends_at && new Date(offer.ends_at).getTime() < now) return false;
        if (offer.stock_limit !== null && offer.usage_count >= offer.stock_limit) return false;
        return true;
      });

      return valid.length > 0 ? valid : INITIAL_OFFERS;
    } catch {
      return INITIAL_OFFERS;
    }
  },
  ['offers'],
  { revalidate: 60, tags: ['offers'] }
);

const getFlagshipProductCached = unstable_cache(
  async (slug: string): Promise<FlagshipProductBundle> => {
    const fallback: FlagshipProductBundle = {
      product: INITIAL_PRODUCT,
      variants: INITIAL_VARIANTS,
      images: INITIAL_IMAGES,
      features: INITIAL_FEATURES,
      sizeGuides: INITIAL_SIZE_GUIDES,
      offers: INITIAL_OFFERS,
      reviews: [],
      averageRating: null,
      reviewCount: 0,
      isLiveDatabase: false,
    };

    if (!isPublicSupabaseConfigured()) return fallback;

    try {
      const supabase = createPublicSupabaseClient();
      const { data: productData, error: prodErr } = await supabase
        .from('products')
        .select('*')
        .eq('slug', slug)
        .eq('status', 'published')
        .maybeSingle();

      if (prodErr || !productData) return fallback;

      const product = productData as Product;

      const [variantsRes, imagesRes, featuresRes, guidesRes, offers, reviewsRes] =
        await Promise.all([
          supabase
            .from('product_variants')
            .select('*, inventory(*)')
            .eq('product_id', product.id)
            .eq('is_active', true)
            .order('sort_order', { ascending: true }),
          supabase
            .from('product_images')
            .select('*')
            .eq('product_id', product.id)
            .order('sort_order', { ascending: true }),
          supabase
            .from('product_features')
            .select('*')
            .eq('product_id', product.id)
            .eq('is_active', true)
            .order('sort_order', { ascending: true }),
          supabase
            .from('product_size_guides')
            .select('*')
            .eq('product_id', product.id)
            .order('sort_order', { ascending: true }),
          getActiveOffers(),
          supabase
            .from('reviews')
            .select('*')
            .eq('product_id', product.id)
            .eq('status', 'approved')
            .order('is_featured', { ascending: false })
            .order('created_at', { ascending: false }),
        ]);

      const variants: ProductVariant[] = (variantsRes.data ?? []).map(
        (row: Record<string, unknown>) => {
          const invRaw = row.inventory;
          const inv = (Array.isArray(invRaw) ? invRaw[0] : invRaw) as
            | {
                stock_on_hand?: number;
                stock_reserved?: number;
                low_stock_threshold?: number;
                allow_backorder?: boolean;
              }
            | undefined;
          const stockOnHand = inv?.stock_on_hand ?? 0;
          const stockReserved = inv?.stock_reserved ?? 0;
          return {
            ...(row as unknown as ProductVariant),
            stock_on_hand: stockOnHand,
            stock_reserved: stockReserved,
            available_stock: Math.max(0, stockOnHand - stockReserved),
            low_stock_threshold: inv?.low_stock_threshold ?? 10,
            allow_backorder: inv?.allow_backorder ?? false,
          };
        }
      );

      const reviews = (reviewsRes.data as Review[]) ?? [];
      const reviewCount = reviews.length;
      const averageRating =
        reviewCount > 0
          ? Math.round(
              (reviews.reduce((sum, r) => sum + r.rating, 0) / reviewCount) * 10
            ) / 10
          : null;

      return {
        product,
        variants: variants.length > 0 ? variants : INITIAL_VARIANTS,
        images:
          imagesRes.data && imagesRes.data.length > 0
            ? (imagesRes.data as ProductImage[])
            : INITIAL_IMAGES,
        features:
          featuresRes.data && featuresRes.data.length > 0
            ? (featuresRes.data as ProductFeature[])
            : INITIAL_FEATURES,
        sizeGuides:
          guidesRes.data && guidesRes.data.length > 0
            ? (guidesRes.data as SizeGuideEntry[])
            : INITIAL_SIZE_GUIDES,
        offers,
        reviews,
        averageRating,
        reviewCount,
        isLiveDatabase: true,
      };
    } catch {
      return fallback;
    }
  },
  ['flagship-product'],
  { revalidate: 60, tags: ['products', 'inventory', 'offers', 'reviews'] }
);

export async function getFlagshipProductBundle(
  slug = 'back-support-belt'
): Promise<FlagshipProductBundle> {
  return getFlagshipProductCached(slug);
}

export const getFaqs = unstable_cache(
  async (scope: 'home' | 'product' | 'all' = 'all'): Promise<FAQ[]> => {
    const fallback = INITIAL_FAQS.filter((f) =>
      scope === 'home' ? f.show_on_home : scope === 'product' ? f.show_on_product : true
    );
    if (!isPublicSupabaseConfigured()) return fallback;

    try {
      const supabase = createPublicSupabaseClient();
      let query = supabase
        .from('faqs')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (scope === 'home') query = query.eq('show_on_home', true);
      if (scope === 'product') query = query.eq('show_on_product', true);

      const { data, error } = await query;
      return !error && data && data.length > 0 ? (data as FAQ[]) : fallback;
    } catch {
      return fallback;
    }
  },
  ['faqs'],
  { revalidate: 120, tags: ['content'] }
);

export const getPublishedBlogPosts = unstable_cache(
  async (): Promise<BlogPost[]> => {
    if (!isPublicSupabaseConfigured()) return INITIAL_BLOG_POSTS;

    try {
      const supabase = createPublicSupabaseClient();
      const { data, error } = await supabase
        .from('blog_posts')
        .select('*')
        .eq('is_published', true)
        .order('published_at', { ascending: false });

      return !error && data && data.length > 0 ? (data as BlogPost[]) : INITIAL_BLOG_POSTS;
    } catch {
      return INITIAL_BLOG_POSTS;
    }
  },
  ['blog-posts'],
  { revalidate: 180, tags: ['content'] }
);

export async function getBlogPostBySlug(slug: string): Promise<BlogPost | null> {
  const posts = await getPublishedBlogPosts();
  return posts.find((p) => p.slug === slug) ?? null;
}

export const getShippingZones = unstable_cache(
  async (): Promise<ShippingZone[]> => {
    if (!isPublicSupabaseConfigured()) return INITIAL_SHIPPING_ZONES;

    try {
      const supabase = createPublicSupabaseClient();
      const { data, error } = await supabase
        .from('shipping_zones')
        .select('*')
        .eq('is_active', true);

      return !error && data && data.length > 0
        ? (data as ShippingZone[])
        : INITIAL_SHIPPING_ZONES;
    } catch {
      return INITIAL_SHIPPING_ZONES;
    }
  },
  ['shipping-zones'],
  { revalidate: 180, tags: ['shipping'] }
);

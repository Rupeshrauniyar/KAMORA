export type AdminRole =
  | 'super_admin'
  | 'admin'
  | 'order_manager'
  | 'inventory_manager'
  | 'content_manager';

export type ProductStatus = 'draft' | 'published' | 'archived';

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'processing'
  | 'shipped'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled'
  | 'returned';

export type PaymentStatus =
  | 'pending_payment'
  | 'paid'
  | 'failed'
  | 'refunded'
  | 'partially_refunded'
  | 'cod_pending_collection';

export type PaymentMethod =
  | 'razorpay_upi'
  | 'razorpay_card'
  | 'stripe_card'
  | 'stripe_upi'
  | 'cod'
  | 'external';

export type DiscountType = 'fixed_paise' | 'percentage';

export interface ProductSpecification {
  label: string;
  value: string;
}

export interface ProductIncludedItem {
  title: string;
  detail: string;
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  subtitle: string | null;
  short_description: string;
  description: string;
  mrp_paise: number;
  sale_price_paise: number;
  gst_rate_bps: number;
  hsn_code: string | null;
  material_info: string | null;
  care_instructions: string | null;
  usage_recommendations: string | null;
  specifications: ProductSpecification[];
  whats_included: ProductIncludedItem[];
  status: ProductStatus;
  is_flagship: boolean;
  seo_title: string | null;
  seo_description: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProductVariant {
  id: string;
  product_id: string;
  sku: string;
  size_code: string;
  size_label: string;
  waist_min_inches: number;
  waist_max_inches: number;
  waist_min_cm: number;
  waist_max_cm: number;
  color: string | null;
  mrp_paise: number;
  sale_price_paise: number;
  weight_grams: number;
  is_active: boolean;
  sort_order: number;
  stock_on_hand?: number;
  stock_reserved?: number;
  available_stock?: number;
  low_stock_threshold?: number;
  allow_backorder?: boolean;
}

export interface ProductImage {
  id: string;
  product_id: string;
  storage_path: string | null;
  url: string;
  alt_text: string;
  caption: string | null;
  image_type: 'hero' | 'gallery' | 'detail' | 'lifestyle' | 'size_guide' | 'kit';
  is_primary: boolean;
  sort_order: number;
}

export interface ProductVideo {
  id: string;
  product_id: string;
  title: string;
  description: string | null;
  video_url: string;
  poster_url: string | null;
  duration_seconds: number | null;
  sort_order: number;
}

export interface ProductFeature {
  id: string;
  product_id: string;
  icon_name: string;
  title: string;
  description: string;
  sort_order: number;
  is_active: boolean;
}

export interface SizeGuideEntry {
  id: string;
  product_id: string;
  size_code: string;
  size_label: string;
  waist_min_inches: number;
  waist_max_inches: number;
  waist_min_cm: number;
  waist_max_cm: number;
  belt_length_cm: number | null;
  fit_note: string | null;
  sort_order: number;
}

export interface OfferItem {
  id: string;
  offer_id: string;
  item_title: string;
  item_description: string | null;
  item_type: 'primary_product' | 'complimentary' | 'digital_guide' | 'shipping_benefit';
  value_paise: number;
  is_included: boolean;
  sort_order: number;
}

export interface Offer {
  id: string;
  code: string;
  name: string;
  campaign_type: 'bundle_kit' | 'second_unit_addon' | 'launch_discount';
  headline: string;
  description: string | null;
  badge_text: string | null;
  cta_text: string | null;
  discount_type: DiscountType;
  discount_value: number;
  min_quantity: number;
  min_order_paise: number;
  free_shipping: boolean;
  stock_limit: number | null;
  usage_count: number;
  starts_at: string | null;
  ends_at: string | null;
  is_active: boolean;
  sort_order: number;
  items?: OfferItem[];
}

export interface Coupon {
  id: string;
  code: string;
  description: string | null;
  discount_type: DiscountType;
  discount_value: number;
  min_order_paise: number;
  max_discount_paise: number | null;
  usage_limit: number | null;
  per_customer_limit: number;
  usage_count: number;
  starts_at: string | null;
  expires_at: string | null;
  is_active: boolean;
}

export interface Review {
  id: string;
  product_id: string;
  user_id: string | null;
  order_id: string | null;
  author_name: string;
  author_city: string | null;
  rating: number;
  title: string | null;
  body: string;
  is_verified_purchase: boolean;
  is_featured: boolean;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

export interface FAQ {
  id: string;
  category: string;
  question: string;
  answer: string;
  show_on_home: boolean;
  show_on_product: boolean;
  is_active: boolean;
  sort_order: number;
}

export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content_markdown: string;
  cover_image_url: string | null;
  category: string;
  author_name: string;
  read_time_minutes: number;
  seo_title: string | null;
  seo_description: string | null;
  is_published: boolean;
  published_at: string | null;
}

export interface Banner {
  id: string;
  slot: string;
  eyebrow: string | null;
  headline: string;
  subheadline: string | null;
  primary_cta_label: string | null;
  primary_cta_href: string | null;
  secondary_cta_label: string | null;
  secondary_cta_href: string | null;
  image_url: string | null;
  image_alt: string | null;
  is_active: boolean;
}

export interface Announcement {
  id: string;
  message: string;
  link_label: string | null;
  link_href: string | null;
  starts_at: string | null;
  ends_at: string | null;
  is_active: boolean;
  sort_order: number;
}

export interface ShippingZone {
  id: string;
  name: string;
  pincode_prefixes: string[];
  states: string[];
  shipping_charge_paise: number;
  free_shipping_threshold_paise: number;
  cod_available: boolean;
  cod_fee_paise: number;
  estimated_min_days: number;
  estimated_max_days: number;
  is_serviceable: boolean;
  is_active: boolean;
}

export interface StoreSettings {
  id: string;
  setting_key: string;
  brand_name: string;
  tagline: string;
  support_email: string;
  support_phone: string;
  whatsapp_number: string | null;
  business_legal_name: string;
  business_address: string;
  gstin: string | null;
  gst_inclusive_pricing: boolean;
  default_gst_rate_bps: number;
  currency: string;
  timezone: string;
  cod_enabled: boolean;
  cod_max_order_paise: number;
  free_shipping_threshold_paise: number;
  default_shipping_charge_paise: number;
  return_window_days: number;
  store_live: boolean;
  social_links: Record<string, string>;
  seo_defaults: Record<string, string>;
  logo_url: string | null;
}

export interface ShippingAddress {
  full_name: string;
  phone: string;
  email: string;
  address_line1: string;
  address_line2?: string;
  landmark?: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
}

export interface CartLineItem {
  variant_id: string;
  product_id: string;
  product_slug: string;
  product_name: string;
  size_code: string;
  size_label: string;
  sku: string;
  image_url: string;
  quantity: number;
  unit_mrp_paise: number;
  unit_price_paise: number;
  gst_rate_bps: number;
  available_stock: number;
}

export interface PricingBreakdown {
  mrp_total_paise: number;
  subtotal_paise: number;
  catalog_savings_paise: number;
  offer_discount_paise: number;
  coupon_discount_paise: number;
  shipping_paise: number;
  cod_fee_paise: number;
  tax_paise: number;
  tax_inclusive: boolean;
  total_paise: number;
  total_savings_paise: number;
  qualifies_for_comfort_kit: boolean;
  qualifies_for_free_shipping: boolean;
  applied_offers: { code: string; name: string; discount_paise: number }[];
  applied_coupon: { code: string; discount_paise: number } | null;
}

export interface OrderRecord {
  id: string;
  order_number: string;
  user_id: string | null;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  shipping_address: ShippingAddress;
  currency: string;
  subtotal_paise: number;
  offer_discount_paise: number;
  coupon_discount_paise: number;
  shipping_paise: number;
  tax_paise: number;
  total_paise: number;
  applied_offer_codes: string[];
  applied_coupon_code: string | null;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  order_status: OrderStatus;
  internal_notes: string | null;
  created_at: string;
  updated_at: string;
  items?: {
    id: string;
    product_name: string;
    variant_label: string;
    sku: string;
    quantity: number;
    unit_price_paise: number;
    line_total_paise: number;
  }[];
  shipment?: {
    courier_name: string | null;
    tracking_number: string | null;
    tracking_url: string | null;
    shipment_status: string;
    estimated_delivery_date: string | null;
  } | null;
}

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
  ShippingZone,
  SizeGuideEntry,
  StoreSettings,
} from '@/types/database';

/**
 * Baseline catalog metadata mirroring supabase/seed.sql.
 * Used strictly as a fallback when Supabase environment variables are not yet connected
 * so the storefront layout can be inspected prior to connecting a Supabase project.
 * Contains ZERO fake customer reviews, ZERO fake ratings, and ZERO fake orders.
 */
export const INITIAL_SETTINGS: StoreSettings = {
  id: '00000000-0000-0000-0000-000000000001',
  setting_key: 'default',
  brand_name: 'Kamora',
  tagline: 'Move Freely. Live Fully.',
  support_email: 'support@kamora.in',
  support_phone: '+91 98765 43210',
  whatsapp_number: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? '919876543210',
  business_legal_name: 'Kamora Wellness Private Limited',
  business_address: 'Indiranagar, Bengaluru, Karnataka 560038, India',
  gstin: '29AABCK1234F1Z5',
  gst_inclusive_pricing: true,
  default_gst_rate_bps: 1200,
  currency: 'INR',
  timezone: 'Asia/Kolkata',
  cod_enabled: true,
  cod_max_order_paise: 1000000,
  free_shipping_threshold_paise: 149900,
  default_shipping_charge_paise: 9900,
  return_window_days: 7,
  store_live: true,
  social_links: {
    instagram: 'https://instagram.com/kamorawellness',
    facebook: 'https://facebook.com/kamorawellness',
    youtube: 'https://youtube.com/@kamorawellness',
  },
  seo_defaults: {
    title: 'Kamora — Premium Adjustable Back Support Belt | Everyday Lumbar Comfort',
    description:
      'Thoughtfully designed adjustable back support belt for everyday movement, posture awareness, and breathable lumbar comfort across India.',
  },
  logo_url: null,
};

export const INITIAL_ANNOUNCEMENTS: Announcement[] = [
  {
    id: 'ann-1',
    message:
      'Exclusive Launch Offer: Complete Back Comfort Kit with Complimentary Storage Pouch & Digital Fit Guide',
    link_label: 'Explore Kit',
    link_href: '/products/back-support-belt#comfort-kit',
    starts_at: null,
    ends_at: null,
    is_active: true,
    sort_order: 1,
  },
  {
    id: 'ann-2',
    message: 'Free Shipping across India on eligible orders above ₹1,499',
    link_label: 'Shop Belt',
    link_href: '/products/back-support-belt',
    starts_at: null,
    ends_at: null,
    is_active: true,
    sort_order: 2,
  },
];

export const INITIAL_BANNERS: Record<string, Banner> = {
  hero: {
    id: 'banner-hero',
    slot: 'hero',
    eyebrow: 'KAMORA LUMBAR SERIES',
    headline: 'Move Freely. Live Fully.',
    subheadline:
      'Thoughtfully designed back support for everyday movement, comfort and confidence.',
    primary_cta_label: 'Discover Your Support',
    primary_cta_href: '/products/back-support-belt',
    secondary_cta_label: 'Explore the Benefits',
    secondary_cta_href: '#benefits',
    image_url: '/images/hero-belt.jpg',
    image_alt: 'Kamora Premium Adjustable Back Support Belt on minimalist studio pedestal',
    is_active: true,
  },
  final_cta: {
    id: 'banner-final-cta',
    slot: 'final_cta',
    eyebrow: 'EVERYDAY LUMBAR COMFORT',
    headline: 'Make Comfort Part of Your Everyday.',
    subheadline:
      'Engineered with breathable knit air-mesh and dual-tension adjustment for calm, reliable lower-back support.',
    primary_cta_label: 'Shop the Back Support Belt',
    primary_cta_href: '/products/back-support-belt',
    secondary_cta_label: 'Find Your Size',
    secondary_cta_href: '/products/back-support-belt#size-guide',
    image_url: '/images/belt-lifestyle.jpg',
    image_alt: 'Adult wearing the Kamora Adjustable Back Support Belt comfortably at home',
    is_active: true,
  },
};

export const INITIAL_PRODUCT: Product = {
  id: '00000000-0000-0000-0000-000000000101',
  slug: 'back-support-belt',
  name: 'Kamora Adjustable Back Support Belt',
  subtitle: 'Dual-Tension Ergonomic Lumbar Support for Everyday Comfort',
  short_description:
    'A thoughtfully engineered, breathable lower-back support belt with contoured rear stays and dual-pull adjustable compression designed for daily movement, desk work, travel, and light activity.',
  description:
    'Designed specifically for everyday Indian climates and active routines, the Kamora Adjustable Back Support Belt pairs a lightweight perforated air-mesh body with contoured flexible lumbar stays. Its dual-pull side tension straps let you fine-tune support smoothly without bulk under everyday clothing.',
  mrp_paise: 349900,
  sale_price_paise: 249900,
  gst_rate_bps: 1200,
  hsn_code: '90211000',
  material_info:
    'Perforated breathable nylon-spandex air-mesh exterior, soft brushed cotton-blend inner lining, contoured polypropylene ergonomic stays, and low-profile micro-hook fastening.',
  care_instructions:
    'Hand wash cold with mild liquid detergent. Close hook-and-loop fasteners before washing. Do not bleach, wring, iron, or tumble dry. Dry flat in shade.',
  usage_recommendations:
    'Wear over a thin breathable cotton layer during work, commuting, household chores, or walks. Start with 1–2 hours daily and adjust tension for comfortable support without restricting normal breathing. Consult a qualified healthcare professional if you have an acute spinal injury, post-surgical recovery needs, or persistent pain.',
  specifications: [
    { label: 'Support Type', value: 'Contoured Lumbar & Lower-Back Support' },
    { label: 'Compression System', value: 'Dual-Pull Adjustable Elastic Side Straps' },
    { label: 'Internal Stays', value: '4 Flexible Contoured Ergonomic Support Stays' },
    { label: 'Fabric', value: 'Breathable Perforated Air-Mesh with Soft Inner Lining' },
    { label: 'Rear Panel Height', value: '21 cm (8.25 in) Ergonomic Lumbar Coverage' },
    { label: 'Fastening', value: 'Low-Profile Micro-Hook & Loop (Snag-Resistant)' },
    { label: 'Suitable Climate', value: 'All-Season Breathable Indian Weather Design' },
    { label: 'Country of Origin', value: 'India' },
  ],
  whats_included: [
    {
      title: '1× Kamora Adjustable Back Support Belt',
      detail: 'Selected size with dual-pull compression straps',
    },
    {
      title: '1× Complimentary Breathable Storage Pouch',
      detail: 'Included with the Complete Back Comfort Kit',
    },
    {
      title: '1× Digital Fit & Everyday Usage Guide',
      detail: 'Instant access with sizing, posture, and care instructions',
    },
  ],
  status: 'published',
  is_flagship: true,
  seo_title: 'Kamora Adjustable Back Support Belt | Breathable Everyday Lumbar Support India',
  seo_description:
    'Shop the Kamora Adjustable Back Support Belt in India. Breathable air-mesh, dual-tension compression, ergonomic lumbar support, and easy size selection.',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

export const INITIAL_VARIANTS: ProductVariant[] = [
  {
    id: '00000000-0000-0000-0000-000000000201',
    product_id: INITIAL_PRODUCT.id,
    sku: 'KMR-BSB-S',
    size_code: 'S',
    size_label: 'Small (26–30 in)',
    waist_min_inches: 26,
    waist_max_inches: 30,
    waist_min_cm: 66,
    waist_max_cm: 76,
    color: 'Slate Blue & Mist',
    mrp_paise: 349900,
    sale_price_paise: 249900,
    weight_grams: 310,
    is_active: true,
    sort_order: 1,
    stock_on_hand: 60,
    stock_reserved: 0,
    available_stock: 60,
    low_stock_threshold: 10,
    allow_backorder: false,
  },
  {
    id: '00000000-0000-0000-0000-000000000202',
    product_id: INITIAL_PRODUCT.id,
    sku: 'KMR-BSB-M',
    size_code: 'M',
    size_label: 'Medium (30–34 in)',
    waist_min_inches: 30.1,
    waist_max_inches: 34,
    waist_min_cm: 76.5,
    waist_max_cm: 86.5,
    color: 'Slate Blue & Mist',
    mrp_paise: 349900,
    sale_price_paise: 249900,
    weight_grams: 330,
    is_active: true,
    sort_order: 2,
    stock_on_hand: 60,
    stock_reserved: 0,
    available_stock: 60,
    low_stock_threshold: 10,
    allow_backorder: false,
  },
  {
    id: '00000000-0000-0000-0000-000000000203',
    product_id: INITIAL_PRODUCT.id,
    sku: 'KMR-BSB-L',
    size_code: 'L',
    size_label: 'Large (34–38 in)',
    waist_min_inches: 34.1,
    waist_max_inches: 38,
    waist_min_cm: 86.6,
    waist_max_cm: 96.5,
    color: 'Slate Blue & Mist',
    mrp_paise: 349900,
    sale_price_paise: 249900,
    weight_grams: 350,
    is_active: true,
    sort_order: 3,
    stock_on_hand: 60,
    stock_reserved: 0,
    available_stock: 60,
    low_stock_threshold: 10,
    allow_backorder: false,
  },
  {
    id: '00000000-0000-0000-0000-000000000204',
    product_id: INITIAL_PRODUCT.id,
    sku: 'KMR-BSB-XL',
    size_code: 'XL',
    size_label: 'Extra Large (38–42 in)',
    waist_min_inches: 38.1,
    waist_max_inches: 42,
    waist_min_cm: 96.6,
    waist_max_cm: 106.5,
    color: 'Slate Blue & Mist',
    mrp_paise: 349900,
    sale_price_paise: 249900,
    weight_grams: 370,
    is_active: true,
    sort_order: 4,
    stock_on_hand: 60,
    stock_reserved: 0,
    available_stock: 60,
    low_stock_threshold: 10,
    allow_backorder: false,
  },
  {
    id: '00000000-0000-0000-0000-000000000205',
    product_id: INITIAL_PRODUCT.id,
    sku: 'KMR-BSB-XXL',
    size_code: 'XXL',
    size_label: '2X Large (42–48 in)',
    waist_min_inches: 42.1,
    waist_max_inches: 48,
    waist_min_cm: 106.6,
    waist_max_cm: 122,
    color: 'Slate Blue & Mist',
    mrp_paise: 349900,
    sale_price_paise: 249900,
    weight_grams: 395,
    is_active: true,
    sort_order: 5,
    stock_on_hand: 60,
    stock_reserved: 0,
    available_stock: 60,
    low_stock_threshold: 10,
    allow_backorder: false,
  },
];

export const INITIAL_IMAGES: ProductImage[] = [
  {
    id: 'img-1',
    product_id: INITIAL_PRODUCT.id,
    storage_path: null,
    url: '/images/hero-belt.jpg',
    alt_text: 'Kamora Adjustable Back Support Belt front studio view',
    caption: 'Contoured Lumbar Architecture',
    image_type: 'hero',
    is_primary: true,
    sort_order: 1,
  },
  {
    id: 'img-2',
    product_id: INITIAL_PRODUCT.id,
    storage_path: null,
    url: '/images/belt-detail.jpg',
    alt_text: 'Close-up of breathable air-mesh and dual-pull adjustable fastening straps',
    caption: 'Breathable Air-Mesh & Dual-Pull Straps',
    image_type: 'detail',
    is_primary: false,
    sort_order: 2,
  },
  {
    id: 'img-3',
    product_id: INITIAL_PRODUCT.id,
    storage_path: null,
    url: '/images/belt-lifestyle.jpg',
    alt_text: 'Adult wearing the Kamora Adjustable Back Support Belt comfortably at home',
    caption: 'Discreet Everyday Wearability',
    image_type: 'lifestyle',
    is_primary: false,
    sort_order: 3,
  },
  {
    id: 'img-4',
    product_id: INITIAL_PRODUCT.id,
    storage_path: null,
    url: '/images/comfort-kit.jpg',
    alt_text: 'Complete Back Comfort Kit with back support belt, storage pouch, and usage guide',
    caption: 'The Complete Back Comfort Kit',
    image_type: 'kit',
    is_primary: false,
    sort_order: 4,
  },
];

export const INITIAL_FEATURES: ProductFeature[] = [
  {
    id: 'feat-1',
    product_id: INITIAL_PRODUCT.id,
    icon_name: 'sliders-horizontal',
    title: 'Adjustable Compression',
    description:
      'Dual-pull elastic tension straps let you fine-tune firm or gentle lumbar support in seconds as your activity changes.',
    sort_order: 1,
    is_active: true,
  },
  {
    id: 'feat-2',
    product_id: INITIAL_PRODUCT.id,
    icon_name: 'shield-check',
    title: 'Supportive Lumbar Design',
    description:
      'Four contoured flexible stays mirror the natural lower-back curve to encourage steady posture without rigid bulk.',
    sort_order: 2,
    is_active: true,
  },
  {
    id: 'feat-3',
    product_id: INITIAL_PRODUCT.id,
    icon_name: 'wind',
    title: 'Breathable Construction',
    description:
      'Lightweight perforated air-mesh promotes continuous airflow so the belt stays comfortable even in warm Indian weather.',
    sort_order: 3,
    is_active: true,
  },
  {
    id: 'feat-4',
    product_id: INITIAL_PRODUCT.id,
    icon_name: 'move',
    title: 'Flexible Everyday Fit',
    description:
      'Tapered front panel sits smoothly around the waist so you can sit, stand, walk, and bend naturally.',
    sort_order: 4,
    is_active: true,
  },
  {
    id: 'feat-5',
    product_id: INITIAL_PRODUCT.id,
    icon_name: 'sparkles',
    title: 'Easy-to-Wear Design',
    description:
      'Smooth low-profile micro-hook closures fasten securely without snagging everyday shirts, kurtas, or activewear.',
    sort_order: 5,
    is_active: true,
  },
  {
    id: 'feat-6',
    product_id: INITIAL_PRODUCT.id,
    icon_name: 'sun',
    title: 'Everyday Support',
    description:
      'Thoughtfully balanced for work-from-home desks, daily commutes, household routines, and light evening walks.',
    sort_order: 6,
    is_active: true,
  },
];

export const INITIAL_SIZE_GUIDES: SizeGuideEntry[] = INITIAL_VARIANTS.map((v, i) => ({
  id: `sg-${i + 1}`,
  product_id: INITIAL_PRODUCT.id,
  size_code: v.size_code,
  size_label: v.size_label.split(' (')[0] ?? v.size_label,
  waist_min_inches: v.waist_min_inches,
  waist_max_inches: v.waist_max_inches,
  waist_min_cm: v.waist_min_cm,
  waist_max_cm: v.waist_max_cm,
  belt_length_cm: 88 + i * 8,
  fit_note:
    i === 4
      ? 'If you are between two sizes, choose the larger size for comfortable adjustability.'
      : 'Measure horizontally around the navel while standing relaxed.',
  sort_order: i + 1,
}));

export const INITIAL_OFFERS: Offer[] = [
  {
    id: 'offer-kit',
    code: 'COMPLETE_COMFORT_KIT',
    name: 'The Complete Back Comfort Kit',
    campaign_type: 'bundle_kit',
    headline: 'Everything You Need for a More Comfortable Everyday Routine.',
    description:
      'Includes one Kamora Adjustable Back Support Belt at exclusive launch pricing, a complimentary breathable storage pouch, our digital fit & usage guide, and free shipping across India.',
    badge_text: 'EXCLUSIVE LAUNCH OFFER',
    cta_text: 'Get Your Comfort Kit',
    discount_type: 'fixed_paise',
    discount_value: 0,
    min_quantity: 1,
    min_order_paise: 149900,
    free_shipping: true,
    stock_limit: null,
    usage_count: 0,
    starts_at: null,
    ends_at: null,
    is_active: true,
    sort_order: 1,
    items: [
      {
        id: 'oi-1',
        offer_id: 'offer-kit',
        item_title: 'Kamora Adjustable Back Support Belt',
        item_description: 'Dual-tension ergonomic lumbar support in your chosen size',
        item_type: 'primary_product',
        value_paise: 349900,
        is_included: true,
        sort_order: 1,
      },
      {
        id: 'oi-2',
        offer_id: 'offer-kit',
        item_title: 'Complimentary Premium Storage Pouch',
        item_description: 'Tailored matte-obsidian woven travel and drawer pouch',
        item_type: 'complimentary',
        value_paise: 39900,
        is_included: true,
        sort_order: 2,
      },
      {
        id: 'oi-3',
        offer_id: 'offer-kit',
        item_title: 'Complimentary Digital Fit & Usage Guide',
        item_description: 'Step-by-step sizing, wearing, and care handbook',
        item_type: 'digital_guide',
        value_paise: 29900,
        is_included: true,
        sort_order: 3,
      },
      {
        id: 'oi-4',
        offer_id: 'offer-kit',
        item_title: 'Free Shipping Across India',
        item_description: 'Complimentary standard delivery on eligible orders',
        item_type: 'shipping_benefit',
        value_paise: 9900,
        is_included: true,
        sort_order: 4,
      },
    ],
  },
  {
    id: 'offer-family',
    code: 'FAMILY_COMFORT_ADDON',
    name: 'Family Comfort Add-On',
    campaign_type: 'second_unit_addon',
    headline: 'Add a Second Belt for a Family Member — Save ₹400 on Unit 2.',
    description:
      'Automatically applied in your cart whenever you order 2 or more belts in any size combination. Ideal for parents, partners, or keeping a spare for travel.',
    badge_text: 'OPTIONAL QUANTITY SAVINGS',
    cta_text: 'Add Second Belt & Save',
    discount_type: 'fixed_paise',
    discount_value: 40000,
    min_quantity: 2,
    min_order_paise: 0,
    free_shipping: true,
    stock_limit: null,
    usage_count: 0,
    starts_at: null,
    ends_at: null,
    is_active: true,
    sort_order: 2,
  },
];

export const INITIAL_SHIPPING_ZONES: ShippingZone[] = [
  {
    id: 'sz-1',
    name: 'Metro Cities (Bengaluru, Mumbai, Delhi NCR, Chennai, Hyderabad, Kolkata, Pune)',
    pincode_prefixes: ['11', '12', '20', '40', '41', '50', '56', '60', '70'],
    states: ['Delhi', 'Maharashtra', 'Karnataka', 'Tamil Nadu', 'Telangana', 'West Bengal', 'Haryana'],
    shipping_charge_paise: 7900,
    free_shipping_threshold_paise: 149900,
    cod_available: true,
    cod_fee_paise: 0,
    estimated_min_days: 2,
    estimated_max_days: 4,
    is_serviceable: true,
    is_active: true,
  },
  {
    id: 'sz-2',
    name: 'Major Tier-1 & Tier-2 Cities',
    pincode_prefixes: ['13', '14', '16', '22', '28', '30', '38', '39', '45', '46', '52', '53', '62', '64', '68', '75', '80'],
    states: ['Gujarat', 'Rajasthan', 'Punjab', 'Madhya Pradesh', 'Kerala', 'Andhra Pradesh', 'Odisha', 'Bihar'],
    shipping_charge_paise: 9900,
    free_shipping_threshold_paise: 149900,
    cod_available: true,
    cod_fee_paise: 0,
    estimated_min_days: 3,
    estimated_max_days: 5,
    is_serviceable: true,
    is_active: true,
  },
  {
    id: 'sz-3',
    name: 'Rest of India',
    pincode_prefixes: ['1', '2', '3', '4', '5', '6', '7', '8'],
    states: ['All Other Indian States'],
    shipping_charge_paise: 11900,
    free_shipping_threshold_paise: 149900,
    cod_available: true,
    cod_fee_paise: 4900,
    estimated_min_days: 4,
    estimated_max_days: 7,
    is_serviceable: true,
    is_active: true,
  },
  {
    id: 'sz-4',
    name: 'North-East & Island Territories',
    pincode_prefixes: ['78', '79', '74', '19'],
    states: ['Assam', 'Meghalaya', 'Manipur', 'Mizoram', 'Nagaland', 'Tripura', 'Arunachal Pradesh', 'Sikkim'],
    shipping_charge_paise: 14900,
    free_shipping_threshold_paise: 249900,
    cod_available: false,
    cod_fee_paise: 0,
    estimated_min_days: 5,
    estimated_max_days: 9,
    is_serviceable: true,
    is_active: true,
  },
];

export const INITIAL_FAQS: FAQ[] = [
  {
    id: 'faq-1',
    category: 'Product',
    question: 'What is the Kamora Adjustable Back Support Belt designed for?',
    answer:
      'The belt is designed to provide gentle, customizable lower-back support and posture awareness during everyday routines such as desk work, commuting, household chores, and light walking. It is a wellness support accessory and is not intended to diagnose, treat, or cure medical spinal conditions.',
    show_on_home: true,
    show_on_product: true,
    is_active: true,
    sort_order: 1,
  },
  {
    id: 'faq-2',
    category: 'Sizing',
    question: 'How do I choose my correct size?',
    answer:
      'Measure around the widest part of your waist near the navel using a flexible measuring tape while standing relaxed. Compare your measurement in inches or centimetres with our interactive Size Guide. If you fall between two sizes, we recommend choosing the larger size for comfortable adjustability.',
    show_on_home: true,
    show_on_product: true,
    is_active: true,
    sort_order: 2,
  },
  {
    id: 'faq-3',
    category: 'Usage',
    question: 'How do I wear the belt properly?',
    answer:
      'Position the contoured rear panel squarely over your lower back, wrap the primary waist band snugly across your abdomen, and then pull both outer side tension straps forward to set your preferred compression level. Wear over a light cotton T-shirt or inner layer.',
    show_on_home: true,
    show_on_product: true,
    is_active: true,
    sort_order: 3,
  },
  {
    id: 'faq-4',
    category: 'Care',
    question: 'How should I clean and maintain the belt?',
    answer:
      'Fasten all hook-and-loop tabs before washing. Gently hand wash in cool water using mild detergent, rinse thoroughly, and lay flat to dry in the shade. Avoid machine washing, bleach, ironing, or direct high heat.',
    show_on_home: true,
    show_on_product: true,
    is_active: true,
    sort_order: 4,
  },
  {
    id: 'faq-5',
    category: 'Usage',
    question: 'How long should I wear the belt each day?',
    answer:
      'Most customers start with 1 to 2 hours at a time during activities that challenge lower-back comfort and adjust based on personal comfort. Avoid wearing the belt while sleeping unless specifically advised by a qualified healthcare professional.',
    show_on_home: true,
    show_on_product: true,
    is_active: true,
    sort_order: 5,
  },
  {
    id: 'faq-6',
    category: 'Usage',
    question: 'Can I wear it while working at a desk or travelling?',
    answer:
      'Yes. The slim front profile and breathable perforated air-mesh are specifically designed so the belt stays comfortable while seated at an office desk, driving, or travelling.',
    show_on_home: true,
    show_on_product: true,
    is_active: true,
    sort_order: 6,
  },
  {
    id: 'faq-7',
    category: 'Offers',
    question: 'What is included in the Complete Back Comfort Kit?',
    answer:
      'The Complete Back Comfort Kit includes one Kamora Adjustable Back Support Belt in your chosen size, a complimentary breathable storage pouch, instant access to our digital fit & usage guide, and free standard shipping on eligible orders.',
    show_on_home: true,
    show_on_product: true,
    is_active: true,
    sort_order: 7,
  },
  {
    id: 'faq-8',
    category: 'Payments',
    question: 'What payment methods are available?',
    answer:
      'We accept major Indian credit and debit cards via Stripe, other payment methods enabled on our verified merchant account, and Cash on Delivery (COD) for eligible PIN codes across India.',
    show_on_home: true,
    show_on_product: true,
    is_active: true,
    sort_order: 8,
  },
  {
    id: 'faq-9',
    category: 'Shipping',
    question: 'How long does delivery take in India?',
    answer:
      'Orders are typically dispatched within 24–48 business hours. Metro cities generally receive delivery in 2–4 business days, while most other Indian PIN codes receive delivery in 3–7 business days. Enter your PIN code on the product page for an exact zone estimate.',
    show_on_home: true,
    show_on_product: true,
    is_active: true,
    sort_order: 9,
  },
  {
    id: 'faq-10',
    category: 'Returns',
    question: 'What is your return and size exchange policy?',
    answer:
      'We offer a straightforward 7-day return and size exchange window from the date of delivery for unused items in original packaging with all tags intact. Contact our support team with your order number to initiate a quick exchange or refund.',
    show_on_home: true,
    show_on_product: true,
    is_active: true,
    sort_order: 10,
  },
];

export const INITIAL_BLOG_POSTS: BlogPost[] = [
  {
    id: 'blog-1',
    slug: 'understanding-everyday-lumbar-support',
    title: 'Understanding Everyday Lumbar Support: How Adjustable Compression Works',
    excerpt:
      'Learn how gentle, customizable lower-back support complements healthy movement habits during long workdays and travel.',
    content_markdown: `## Why Lower-Back Comfort Matters in Everyday Life

Between long desk hours, daily commutes, and household routines, our lumbar spine handles continuous load throughout the day. While regular movement and core conditioning remain foundational for long-term back health, a well-fitted adjustable back support belt can serve as a practical companion during demanding stretches.

## How Dual-Tension Compression Helps

Unlike rigid braces that restrict natural movement, an everyday adjustable lumbar belt combines:

- **Contoured rear support stays** that follow the gentle curve of the lower back.
- **Breathable air-mesh construction** suited for warm, humid Indian climates.
- **Dual side-pull straps** that let you loosen tension while seated and add gentle firmness while standing or walking.

## Responsible Usage Note

A back support belt is designed for everyday comfort and posture awareness. If you experience persistent, radiating, or acute pain, always consult an orthopedic specialist or physiotherapist for personalized medical guidance.`,
    cover_image_url: '/images/belt-lifestyle.jpg',
    category: 'Lumbar Care',
    author_name: 'Kamora Wellness Editorial',
    read_time_minutes: 4,
    seo_title: 'Understanding Everyday Lumbar Support | Kamora Journal',
    seo_description:
      'Discover how adjustable dual-tension back support works and how to integrate it responsibly into everyday movement.',
    is_published: true,
    published_at: new Date(Date.now() - 12 * 86400_000).toISOString(),
  },
  {
    id: 'blog-2',
    slug: 'how-to-measure-and-fit-your-back-support-belt',
    title: 'How to Measure Your Waist and Fit a Back Support Belt Properly',
    excerpt:
      'A practical step-by-step guide to measuring accurately at home and adjusting strap tension for all-day comfort.',
    content_markdown: `## Step 1: Measure Around the Navel — Not Your Trouser Size

Trouser waist sizes vary widely across brands and typically sit lower than your lumbar curve. Stand relaxed, exhale normally, and wrap a flexible measuring tape horizontally around your waist at navel level.

## Step 2: Position the Rear Panel Correctly

Centre the contoured rear panel over the curve of your lower back so the lower edge sits comfortably above the hips. It should never press uncomfortably into your ribs or dig into your thighs when seated.

## Step 3: Fine-Tune Dual Tension

Fasten the inner main band snugly first, then pull both outer elastic straps forward evenly. The ideal tension feels supportive and reassuring while allowing you to breathe deeply and move smoothly.`,
    cover_image_url: '/images/belt-detail.jpg',
    category: 'Sizing & Fit',
    author_name: 'Kamora Wellness Editorial',
    read_time_minutes: 3,
    seo_title: 'How to Measure & Fit a Back Support Belt | Kamora Journal',
    seo_description:
      'Step-by-step instructions to choose the right back support belt size and wear it comfortably every day.',
    is_published: true,
    published_at: new Date(Date.now() - 7 * 86400_000).toISOString(),
  },
  {
    id: 'blog-3',
    slug: 'everyday-posture-habits-for-desk-and-travel',
    title: 'Five Simple Posture Habits for Long Desk Days and Commutes',
    excerpt:
      'Small ergonomic adjustments you can combine with mindful breaks to keep your lower back feeling fresh.',
    content_markdown: `## 1. Reset Every 45 Minutes

Even the best ergonomic chair cannot replace periodic movement. Stand up, roll your shoulders gently, and walk for two minutes every 45–60 minutes.

## 2. Keep Screens at Eye Level

Raise laptops onto a stand so your chin stays neutral rather than sloping forward, which shifts load down the entire spine.

## 3. Ground Both Feet Flat

Keep knees roughly level with hips and feet flat on the floor or a footrest to stabilize your pelvis.

## 4. Support Your Lumbar Curve During Travel

Long drives and flights often flatten the natural lower-back curve. Wearing a breathable, low-profile lumbar support belt can help maintain comfortable alignment on longer journeys.

## 5. Care for Your Support Gear

Keep your belt fresh by wearing it over a clean cotton layer and hand-washing periodically in cool water.`,
    cover_image_url: '/images/comfort-kit.jpg',
    category: 'Everyday Wellness',
    author_name: 'Kamora Wellness Editorial',
    read_time_minutes: 4,
    seo_title: 'Everyday Posture Habits for Desk & Travel | Kamora Journal',
    seo_description:
      'Practical posture habits and travel tips to support everyday lower-back comfort.',
    is_published: true,
    published_at: new Date(Date.now() - 3 * 86400_000).toISOString(),
  },
];

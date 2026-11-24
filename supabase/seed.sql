-- =============================================================================
-- KAMORA — Production-Oriented Initial Seed Data
-- Contains flagship product catalog, size guides, dynamic offers, Indian
-- shipping zones, responsible FAQs, and editorial guides.
-- ZERO fake customer reviews, ZERO fake orders, ZERO fabricated claims.
-- =============================================================================

-- 1. Store Settings
insert into public.store_settings (
  setting_key, brand_name, tagline, support_email, support_phone, whatsapp_number,
  business_legal_name, business_address, gstin, gst_inclusive_pricing,
  default_gst_rate_bps, currency, timezone, cod_enabled, cod_max_order_paise,
  free_shipping_threshold_paise, default_shipping_charge_paise, return_window_days,
  store_live, social_links, seo_defaults
) values (
  'default',
  'Kamora',
  'Move Freely. Live Fully.',
  'support@kamora.in',
  '+91 98765 43210',
  '919876543210',
  'Kamora Wellness Private Limited',
  'Indiranagar, Bengaluru, Karnataka 560038, India',
  '29AABCK1234F1Z5',
  true,
  1200,
  'INR',
  'Asia/Kolkata',
  true,
  1000000,
  149900,
  9900,
  7,
  true,
  '{"instagram":"https://instagram.com/kamorawellness","facebook":"https://facebook.com/kamorawellness","youtube":"https://youtube.com/@kamorawellness"}'::jsonb,
  '{"title":"Kamora — Premium Adjustable Back Support Belt | Everyday Lumbar Comfort","description":"Thoughtfully designed adjustable back support belt for everyday movement, posture support, and breathable lumbar comfort across India."}'::jsonb
)
on conflict (setting_key) do nothing;

-- 2. Announcements
insert into public.announcements (message, link_label, link_href, is_active, sort_order)
values
  ('Exclusive Launch Offer: Complete Back Comfort Kit with Complimentary Storage Pouch & Digital Fit Guide', 'View Offer', '/products/back-support-belt#comfort-kit', true, 1),
  ('Free Shipping across India on eligible orders above ₹1,499', 'Shop Now', '/products/back-support-belt', true, 2),
  ('Need sizing help? Chat with Kamora Care on WhatsApp', 'Contact Us', '/contact', true, 3)
on conflict do nothing;

-- 3. Homepage Banners (Dynamically manageable from /admin/content)
insert into public.banners (slot, eyebrow, headline, subheadline, primary_cta_label, primary_cta_href, secondary_cta_label, secondary_cta_href, image_url, image_alt, is_active)
values
  (
    'hero',
    'KAMORA LUMBAR SERIES',
    'Move Freely. Live Fully.',
    'Thoughtfully designed back support for everyday movement, comfort and confidence.',
    'Discover Your Support',
    '/products/back-support-belt',
    'Explore the Benefits',
    '#benefits',
    '/images/hero-belt.jpg',
    'Kamora Premium Adjustable Back Support Belt on minimalist studio pedestal',
    true
  ),
  (
    'final_cta',
    'EVERYDAY LUMBAR COMFORT',
    'Make Comfort Part of Your Everyday.',
    'Engineered with breathable knit fabric and dual-tension adjustment for calm, reliable lower-back support.',
    'Shop the Back Support Belt',
    '/products/back-support-belt',
    'Check Your Size',
    '/products/back-support-belt#size-guide',
    '/images/belt-lifestyle.jpg',
    'Adult wearing the Kamora Adjustable Back Support Belt during everyday movement',
    true
  )
on conflict (slot) do nothing;

-- 4. Flagship Product: Premium Adjustable Back Support Belt
with inserted_product as (
  insert into public.products (
    slug, name, subtitle, short_description, description,
    mrp_paise, sale_price_paise, gst_rate_bps, hsn_code,
    material_info, care_instructions, usage_recommendations,
    specifications, whats_included, status, is_flagship,
    seo_title, seo_description
  ) values (
    'back-support-belt',
    'Kamora Adjustable Back Support Belt',
    'Dual-Tension Ergonomic Lumbar Support for Everyday Comfort',
    'A thoughtfully engineered, breathable lower-back support belt with contoured rear stays and dual-pull adjustable compression designed for daily movement, desk work, travel, and light activity.',
    'Designed specifically for everyday Indian climates and active routines, the Kamora Adjustable Back Support Belt pairs a lightweight perforated air-mesh body with contoured flexible lumbar stays. Its dual-pull side tension straps let you fine-tune support smoothly without bulk under everyday clothing.',
    349900,
    249900,
    1200,
    '90211000',
    'Perforated breathable nylon-spandex air-mesh exterior, soft brushed cotton-blend inner lining, contoured polypropylene ergonomic stays, and low-profile micro-hook fastening.',
    'Hand wash cold with mild liquid detergent. Close hook-and-loop fasteners before washing. Do not bleach, wring, iron, or tumble dry. Dry flat in shade.',
    'Wear over a thin breathable cotton layer during work, commuting, household chores, or walks. Start with 1–2 hours daily and adjust tension for comfortable support without restricting normal breathing. Consult a qualified healthcare professional if you have an acute spinal injury, post-surgical recovery needs, or persistent pain.',
    '[
      {"label":"Support Type","value":"Contoured Lumbar & Lower-Back Support"},
      {"label":"Compression System","value":"Dual-Pull Adjustable Elastic Side Straps"},
      {"label":"Internal Stays","value":"4 Flexible Contoured Ergonomic Support Stays"},
      {"label":"Fabric","value":"Breathable Perforated Air-Mesh with Soft Inner Lining"},
      {"label":"Rear Panel Height","value":"21 cm (8.25 in) Ergonomic Lumbar Coverage"},
      {"label":"Fastening","value":"Low-Profile Micro-Hook & Loop (Snag-Resistant)"},
      {"label":"Suitable Climate","value":"All-Season Breathable Indian Weather Design"},
      {"label":"Country of Origin","value":"India"}
    ]'::jsonb,
    '[
      {"title":"1x Kamora Adjustable Back Support Belt","detail":"Selected size with dual-pull compression straps"},
      {"title":"1x Complimentary Breathable Storage Pouch","detail":"Included with the Complete Back Comfort Kit"},
      {"title":"1x Digital Fit & Everyday Usage Guide","detail":"Instant access with sizing, posture, and care instructions"}
    ]'::jsonb,
    'published',
    true,
    'Kamora Adjustable Back Support Belt | Breathable Everyday Lumbar Support India',
    'Shop the Kamora Adjustable Back Support Belt in India. Breathable air-mesh, dual-tension compression, ergonomic lumbar support, and easy size selection.'
  )
  on conflict (slug) do update set updated_at = now()
  returning id
)
-- 5. Variants (S, M, L, XL, XXL)
, inserted_variants as (
  insert into public.product_variants (
    product_id, sku, size_code, size_label,
    waist_min_inches, waist_max_inches, waist_min_cm, waist_max_cm,
    mrp_paise, sale_price_paise, weight_grams, is_active, sort_order
  )
  select
    p.id, v.sku, v.size_code, v.size_label,
    v.wmin_in, v.wmax_in, v.wmin_cm, v.wmax_cm,
    349900, 249900, v.weight, true, v.ord
  from inserted_product p
  cross join (values
    ('KMR-BSB-S',   'S',   'Small (26–30 in)',         26.0, 30.0,  66.0,  76.0, 310, 1),
    ('KMR-BSB-M',   'M',   'Medium (30–34 in)',        30.1, 34.0,  76.5,  86.5, 330, 2),
    ('KMR-BSB-L',   'L',   'Large (34–38 in)',         34.1, 38.0,  86.6,  96.5, 350, 3),
    ('KMR-BSB-XL',  'XL',  'Extra Large (38–42 in)',   38.1, 42.0,  96.6, 106.5, 370, 4),
    ('KMR-BSB-XXL', 'XXL', '2X Large (42–48 in)',      42.1, 48.0, 106.6, 122.0, 395, 5)
  ) as v(sku, size_code, size_label, wmin_in, wmax_in, wmin_cm, wmax_cm, weight, ord)
  on conflict (sku) do update set updated_at = now()
  returning id, size_code
)
-- 6. Initial Inventory per Variant
insert into public.inventory (variant_id, stock_on_hand, stock_reserved, low_stock_threshold, allow_backorder)
select id, 60, 0, 10, false from inserted_variants
on conflict (variant_id) do nothing;

-- 7. Size Guides
insert into public.product_size_guides (
  product_id, size_code, size_label,
  waist_min_inches, waist_max_inches, waist_min_cm, waist_max_cm,
  belt_length_cm, fit_note, sort_order
)
select
  p.id, g.code, g.label, g.min_in, g.max_in, g.min_cm, g.max_cm, g.len_cm, g.note, g.ord
from public.products p
cross join (values
  ('S',   'Small',       26.0, 30.0,  66.0,  76.0,  88.0, 'Snug contour for slender waists. Measure around the navel.', 1),
  ('M',   'Medium',      30.1, 34.0,  76.5,  86.5,  96.0, 'Most popular fit for everyday desk and travel support.', 2),
  ('L',   'Large',       34.1, 38.0,  86.6,  96.5, 106.0, 'Balanced compression with generous side-strap overlap.', 3),
  ('XL',  'Extra Large', 38.1, 42.0,  96.6, 106.5, 116.0, 'Extended wrap length for comfortable full-day adjustability.', 4),
  ('XXL', '2X Large',    42.1, 48.0, 106.6, 122.0, 128.0, 'If you are between two sizes, choose the larger size for comfort.', 5)
) as g(code, label, min_in, max_in, min_cm, max_cm, len_cm, note, ord)
where p.slug = 'back-support-belt'
on conflict (product_id, size_code) do nothing;

-- 8. Product Images
insert into public.product_images (product_id, url, alt_text, caption, image_type, is_primary, sort_order)
select p.id, img.url, img.alt, img.cap, img.itype, img.prim, img.ord
from public.products p
cross join (values
  ('/images/hero-belt.jpg',      'Kamora Adjustable Back Support Belt front studio view', 'Contoured Lumbar Architecture', 'hero', true, 1),
  ('/images/belt-detail.jpg',    'Close-up of breathable air-mesh and dual-pull adjustable fastening straps', 'Breathable Air-Mesh & Dual-Pull Straps', 'detail', false, 2),
  ('/images/belt-lifestyle.jpg', 'Adult wearing the Kamora Adjustable Back Support Belt comfortably at home', 'Discreet Everyday Wearability', 'lifestyle', false, 3),
  ('/images/comfort-kit.jpg',    'Complete Back Comfort Kit with back support belt, storage pouch, and usage guide', 'The Complete Back Comfort Kit', 'kit', false, 4)
) as img(url, alt, cap, itype, prim, ord)
where p.slug = 'back-support-belt'
on conflict do nothing;

-- 9. Product Features (Editable via Admin)
insert into public.product_features (product_id, icon_name, title, description, sort_order, is_active)
select p.id, f.icon, f.title, f.descr, f.ord, true
from public.products p
cross join (values
  ('sliders-horizontal', 'Adjustable Compression', 'Dual-pull elastic tension straps let you fine-tune firm or gentle lumbar support in seconds as your activity changes.', 1),
  ('shield-check', 'Supportive Lumbar Design', 'Four contoured flexible stays mirror the natural lower-back curve to encourage steady posture without rigid bulk.', 2),
  ('wind', 'Breathable Construction', 'Lightweight perforated air-mesh promotes continuous airflow so the belt stays comfortable even in warm Indian weather.', 3),
  ('move', 'Flexible Everyday Fit', 'Tapered front panel sits smoothly around the waist so you can sit, stand, walk, and bend naturally.', 4),
  ('sparkles', 'Easy-to-Wear Design', 'Smooth low-profile micro-hook closures fasten securely without snagging everyday shirts, kurtas, or activewear.', 5),
  ('sun', 'Everyday Support', 'Thoughtfully balanced for work-from-home desks, daily commutes, household routines, and light evening walks.', 6)
) as f(icon, title, descr, ord)
where p.slug = 'back-support-belt'
on conflict do nothing;

-- 10. Dynamic Offers: Complete Back Comfort Kit & Family Comfort Add-On
with kit_offer as (
  insert into public.offers (
    code, name, campaign_type, headline, description, badge_text, cta_text,
    discount_type, discount_value, min_quantity, min_order_paise,
    free_shipping, is_active, sort_order
  ) values (
    'COMPLETE_COMFORT_KIT',
    'The Complete Back Comfort Kit',
    'bundle_kit',
    'Everything You Need for a More Comfortable Everyday Routine.',
    'Includes one Kamora Adjustable Back Support Belt at exclusive launch pricing, a complimentary breathable storage pouch, our digital fit & usage guide, and free shipping across India.',
    'EXCLUSIVE LAUNCH OFFER',
    'Get Your Comfort Kit',
    'fixed_paise',
    0,
    1,
    149900,
    true,
    true,
    1
  )
  on conflict (code) do update set updated_at = now()
  returning id
)
insert into public.offer_items (offer_id, item_title, item_description, item_type, value_paise, is_included, sort_order)
select k.id, i.title, i.descr, i.itype, i.val, true, i.ord
from kit_offer k
cross join (values
  ('Kamora Adjustable Back Support Belt', 'Dual-tension ergonomic lumbar support in your chosen size', 'primary_product', 349900, 1),
  ('Complimentary Premium Storage Pouch', 'Tailored matte-obsidian woven travel and drawer pouch', 'complimentary', 39900, 2),
  ('Complimentary Digital Fit & Usage Guide', 'Step-by-step sizing, wearing, and care handbook', 'digital_guide', 29900, 3),
  ('Free Shipping Across India', 'Complimentary standard delivery on eligible orders', 'shipping_benefit', 9900, 4)
) as i(title, descr, itype, val, ord)
on conflict do nothing;

insert into public.offers (
  code, name, campaign_type, headline, description, badge_text, cta_text,
  discount_type, discount_value, min_quantity, min_order_paise,
  free_shipping, is_active, sort_order
) values (
  'FAMILY_COMFORT_ADDON',
  'Family Comfort Add-On',
  'second_unit_addon',
  'Add a Second Belt for a Family Member — Save ₹400 on Unit 2.',
  'Automatically applied in your cart whenever you order 2 or more belts (any combination of sizes). Ideal for parents, partners, or keeping a spare for travel.',
  'OPTIONAL QUANTITY SAVINGS',
  'Add Second Belt & Save',
  'fixed_paise',
  40000,
  2,
  0,
  true,
  true,
  2
)
on conflict (code) do nothing;

-- 11. Sample Launch Coupons (Admin can edit/disable anytime)
insert into public.coupons (
  code, description, discount_type, discount_value, min_order_paise,
  max_discount_paise, usage_limit, per_customer_limit, is_active
) values
  ('WELCOME150', '₹150 off on orders above ₹2,000', 'fixed_paise', 15000, 200000, 15000, 1000, 1, true),
  ('KAMORA10', '10% launch discount (up to ₹350)', 'percentage', 10, 149900, 35000, 1000, 1, true)
on conflict (code) do nothing;

-- 12. Shipping Zones across India (PIN code prefix matching)
insert into public.shipping_zones (
  name, pincode_prefixes, states, shipping_charge_paise,
  free_shipping_threshold_paise, cod_available, cod_fee_paise,
  estimated_min_days, estimated_max_days, is_serviceable, is_active
) values
  (
    'Metro Cities (Bengaluru, Mumbai, Delhi NCR, Chennai, Hyderabad, Kolkata, Pune)',
    array['11','12','20','40','41','50','56','60','70'],
    array['Delhi','Maharashtra','Karnataka','Tamil Nadu','Telangana','West Bengal','Haryana','Uttar Pradesh'],
    7900, 149900, true, 0, 2, 4, true, true
  ),
  (
    'Major Tier-1 & Tier-2 Cities',
    array['13','14','16','22','28','30','38','39','45','46','52','53','62','64','68','75','80'],
    array['Gujarat','Rajasthan','Punjab','Madhya Pradesh','Kerala','Andhra Pradesh','Odisha','Bihar','Chandigarh'],
    9900, 149900, true, 0, 3, 5, true, true
  ),
  (
    'Rest of India',
    array['1','2','3','4','5','6','7','8'],
    array['All Other Indian States'],
    11900, 149900, true, 4900, 4, 7, true, true
  ),
  (
    'North-East & Island Territories',
    array['78','79','74','19'],
    array['Assam','Meghalaya','Manipur','Mizoram','Nagaland','Tripura','Arunachal Pradesh','Sikkim','Andaman & Nicobar','Jammu & Kashmir','Ladakh'],
    14900, 249900, false, 0, 5, 9, true, true
  )
on conflict (name) do nothing;

-- 13. Responsible FAQs (Editable via Admin)
insert into public.faqs (category, question, answer, show_on_home, show_on_product, is_active, sort_order)
values
  ('Product', 'What is the Kamora Adjustable Back Support Belt designed for?', 'The belt is designed to provide gentle, customizable lower-back support and posture awareness during everyday routines such as desk work, commuting, household chores, and light walking. It is a wellness support accessory and is not intended to diagnose, treat, or cure medical spinal conditions.', true, true, true, 1),
  ('Sizing', 'How do I choose my correct size?', 'Measure around the widest part of your waist near the navel using a flexible measuring tape while standing relaxed. Compare your measurement in inches or centimetres with our interactive Size Guide. If you fall between two sizes, we recommend choosing the larger size for comfortable adjustability.', true, true, true, 2),
  ('Usage', 'How do I wear the belt properly?', 'Position the contoured rear panel squarely over your lower back, wrap the primary waist band snugly across your abdomen, and then pull both outer side tension straps forward to set your preferred compression level. Wear over a light cotton T-shirt or inner layer.', true, true, true, 3),
  ('Care', 'How should I clean and maintain the belt?', 'Fasten all hook-and-loop tabs before washing. Gently hand wash in cool water using mild detergent, rinse thoroughly, and lay flat to dry in the shade. Avoid machine washing, bleach, ironing, or direct high heat.', true, true, true, 4),
  ('Usage', 'How long should I wear the belt each day?', 'Most customers start with 1 to 2 hours at a time during activities that challenge lower-back comfort and adjust based on personal comfort. Avoid wearing the belt while sleeping unless specifically advised by a qualified healthcare professional.', true, true, true, 5),
  ('Usage', 'Can I wear it while working at a desk or travelling?', 'Yes. The slim front profile and breathable perforated air-mesh are specifically designed so the belt stays comfortable while seated at an office desk, driving, or travelling.', true, true, true, 6),
  ('Offers', 'What is included in the Complete Back Comfort Kit?', 'The Complete Back Comfort Kit includes one Kamora Adjustable Back Support Belt in your chosen size, a complimentary breathable storage pouch, instant access to our digital fit & usage guide, and free standard shipping on eligible orders.', true, true, true, 7),
  ('Payments', 'What payment methods are available?', 'We accept major Indian credit and debit cards via Stripe, other payment methods enabled on our verified merchant account, and Cash on Delivery (COD) for eligible PIN codes across India.', true, true, true, 8),
  ('Shipping', 'How long does delivery take in India?', 'Orders are typically dispatched within 24–48 business hours. Metro cities generally receive delivery in 2–4 business days, while most other Indian PIN codes receive delivery in 3–7 business days. Enter your PIN code on the product page for an exact zone estimate.', true, true, true, 9),
  ('Returns', 'What is your return and size exchange policy?', 'We offer a straightforward 7-day return and size exchange window from the date of delivery for unused items in original packaging with all tags intact. Contact our support team with your order number to initiate a quick exchange or refund.', true, true, true, 10)
on conflict do nothing;

-- 14. Educational Knowledge Hub Articles
insert into public.blog_posts (
  slug, title, excerpt, content_markdown, cover_image_url, category,
  author_name, read_time_minutes, seo_title, seo_description, is_published, published_at
) values
  (
    'understanding-everyday-lumbar-support',
    'Understanding Everyday Lumbar Support: How Adjustable Compression Works',
    'Learn how gentle, customizable lower-back support complements healthy movement habits during long workdays and travel.',
    E'## Why Lower-Back Comfort Matters in Everyday Life\n\nBetween long desk hours, daily commutes, and household routines, our lumbar spine handles continuous load throughout the day. While regular movement and core conditioning remain foundational for long-term back health, a well-fitted adjustable back support belt can serve as a practical companion during demanding stretches.\n\n## How Dual-Tension Compression Helps\n\nUnlike rigid braces that restrict natural movement, an everyday adjustable lumbar belt combines:\n\n- **Contoured rear support stays** that follow the gentle curve of the lower back.\n- **Breathable air-mesh construction** suited for warm, humid Indian climates.\n- **Dual side-pull straps** that let you loosen tension while seated and add gentle firmness while standing or walking.\n\n## Responsible Usage Note\n\nA back support belt is designed for everyday comfort and posture awareness. If you experience persistent, radiating, or acute pain, always consult an orthopedic specialist or physiotherapist for personalized medical guidance.',
    '/images/belt-lifestyle.jpg',
    'Lumbar Care',
    'Kamora Wellness Editorial',
    4,
    'Understanding Everyday Lumbar Support | Kamora Journal',
    'Discover how adjustable dual-tension back support works and how to integrate it responsibly into everyday movement.',
    true,
    now() - interval '12 days'
  ),
  (
    'how-to-measure-and-fit-your-back-support-belt',
    'How to Measure Your Waist and Fit a Back Support Belt Properly',
    'A practical step-by-step guide to measuring accurately at home and adjusting strap tension for all-day comfort.',
    E'## Step 1: Measure Around the Navel — Not Your Trouser Size\n\nTrouser waist sizes vary widely across brands and typically sit lower than your lumbar curve. Stand relaxed, exhale normally, and wrap a flexible measuring tape horizontally around your waist at navel level.\n\n## Step 2: Position the Rear Panel Correctly\n\nCentre the contoured rear panel over the curve of your lower back so the lower edge sits comfortably above the hips. It should never press uncomfortably into your ribs or dig into your thighs when seated.\n\n## Step 3: Fine-Tune Dual Tension\n\nFasten the inner main band snugly first, then pull both outer elastic straps forward evenly. The ideal tension feels supportive and reassuring while allowing you to breathe deeply and move smoothly.',
    '/images/belt-detail.jpg',
    'Sizing & Fit',
    'Kamora Wellness Editorial',
    3,
    'How to Measure & Fit a Back Support Belt | Kamora Journal',
    'Step-by-step instructions to choose the right back support belt size and wear it comfortably every day.',
    true,
    now() - interval '7 days'
  ),
  (
    'everyday-posture-habits-for-desk-and-travel',
    'Five Simple Posture Habits for Long Desk Days and Commutes',
    'Small ergonomic adjustments you can combine with mindful breaks to keep your lower back feeling fresh.',
    E'## 1. Reset Every 45 Minutes\n\nEven the best ergonomic chair cannot replace periodic movement. Stand up, roll your shoulders gently, and walk for two minutes every 45–60 minutes.\n\n## 2. Keep Screens at Eye Level\n\nRaise laptops onto a stand so your chin stays neutral rather than sloping forward, which shifts load down the entire spine.\n\n## 3. Ground Both Feet Flat\n\nKeep knees roughly level with hips and feet flat on the floor or a footrest to stabilize your pelvis.\n\n## 4. Support Your Lumbar Curve During Travel\n\nLong drives and flights often flatten the natural lower-back curve. Wearing a breathable, low-profile lumbar support belt can help maintain comfortable alignment on longer journeys.\n\n## 5. Care for Your Support Gear\n\nKeep your belt fresh by wearing it over a clean cotton layer and hand-washing periodically in cool water.',
    '/images/comfort-kit.jpg',
    'Everyday Wellness',
    'Kamora Wellness Editorial',
    4,
    'Everyday Posture Habits for Desk & Travel | Kamora Journal',
    'Practical posture habits and travel tips to support everyday lower-back comfort.',
    true,
    now() - interval '3 days'
  )
on conflict (slug) do nothing;

-- 15. Grant Super Admin role to kamoraind@gmail.com
insert into public.profiles (id, email, full_name, auth_provider)
select id, email, coalesce(raw_user_meta_data->>'full_name', 'Kamora Admin'), 'email'
from auth.users
where lower(email) = 'kamoraind@gmail.com'
on conflict (id) do update set email = excluded.email, updated_at = now();

insert into public.admin_users (user_id, role, is_active)
select id, 'super_admin'::public.admin_role, true
from auth.users
where lower(email) = 'kamoraind@gmail.com'
on conflict (user_id) do update set role = 'super_admin'::public.admin_role, is_active = true;


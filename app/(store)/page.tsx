import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  Sparkles,
} from 'lucide-react';
import {
  getBanners,
  getFaqs,
  getFlagshipProductBundle,
  getStoreSettings,
} from '@/lib/data/storefront';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FeatureIcon } from '@/components/storefront/feature-icon';
import { EngineeringShowcase } from '@/components/storefront/engineering-showcase';
import { FaqAccordion } from '@/components/storefront/faq-accordion';
import { ReviewSection } from '@/components/product/review-section';
import { calculateDiscountPercent, formatPaise } from '@/lib/utils/format';

export const revalidate = 60;

export default async function HomePage() {
  const [bundle, banners, faqs, settings] = await Promise.all([
    getFlagshipProductBundle('back-support-belt'),
    getBanners(),
    getFaqs('home'),
    getStoreSettings(),
  ]);

  const { product, images, features, offers, reviews, averageRating } = bundle;
  const hero = banners.hero;
  const finalCta = banners.final_cta;
  const comfortKitOffer = offers.find((o) => o.campaign_type === 'bundle_kit');
  const familyAddonOffer = offers.find((o) => o.campaign_type === 'second_unit_addon');
  const discountPct = calculateDiscountPercent(product.mrp_paise, product.sale_price_paise);

  const siteUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://kamora.in';
  const organizationJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: settings.brand_name,
    url: siteUrl,
    email: settings.support_email,
    telephone: settings.support_phone,
    address: {
      '@type': 'PostalAddress',
      addressCountry: 'IN',
      streetAddress: settings.business_address,
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
      />

      {/* =====================================================================
          01 / ARCHITECTURAL EDITORIAL HERO
      ====================================================================== */}
      <section className="bg-architectural-hero border-b border-[#E6E3DC]">
        <div className="mx-auto max-w-[1380px] px-4 pb-16 pt-10 sm:px-8 lg:pb-24 lg:pt-14">
          {/* Top Architectural Meta Hairline */}
          <div className="mb-10 flex flex-wrap items-center justify-between gap-4 border-b border-[#E6E3DC] pb-4">
            <span className="font-mono-tech text-[10px] text-[#5C636E]">
              01 / {hero?.eyebrow ?? 'KAMORA LUMBAR SERIES'} · EDITION 01
            </span>
            <span className="font-mono-tech text-[10px] text-[#8A9099]">
              DESIGNED FOR INDIAN CLIMATES · SIZES S–XXL
            </span>
          </div>

          <div className="grid items-center gap-12 lg:grid-cols-12 lg:gap-12">
            {/* Editorial Typography Column */}
            <div className="lg:col-span-6">
              <h1 className="font-heading text-[48px] font-semibold leading-[0.98] tracking-[-0.04em] text-[#0E1116] sm:text-[64px] lg:text-[74px]">
                Move freely.
                <br />
                <span className="font-editorial italic font-normal text-[#1C3D5A]">
                  Live fully.
                </span>
              </h1>

              <p className="mt-7 max-w-lg text-base leading-relaxed text-[#5C636E] sm:text-[17px]">
                {hero?.subheadline ??
                  'Thoughtfully engineered lumbar support crafted from breathable 3D air-mesh and dual-tension straps — built for quiet, everyday posture confidence.'}
              </p>

              {/* Price & Offer Inline Readout */}
              <div className="mt-7 flex flex-wrap items-center gap-4">
                <div className="flex items-baseline gap-2.5">
                  <span className="font-heading text-2xl font-bold text-[#0E1116]">
                    {formatPaise(product.sale_price_paise)}
                  </span>
                  {product.mrp_paise > product.sale_price_paise && (
                    <span className="text-sm text-[#8A9099] line-through">
                      {formatPaise(product.mrp_paise)}
                    </span>
                  )}
                </div>
                {discountPct > 0 && (
                  <Badge variant="champagne">
                    Launch Edition · {discountPct}% Off
                  </Badge>
                )}
              </div>

              {/* Primary & Secondary Pill CTAs */}
              <div className="mt-8 flex flex-wrap items-center gap-3.5">
                <Link href={hero?.primary_cta_href ?? '/products/back-support-belt'}>
                  <Button variant="primary" size="lg">
                    {hero?.primary_cta_label ?? 'Discover Your Support'}
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link href="#engineering">
                  <Button variant="secondary" size="lg">
                    Explore Architecture
                  </Button>
                </Link>
              </div>

              {/* Technical Spec Strip */}
              <dl className="mt-12 grid grid-cols-3 gap-4 border-t border-[#E6E3DC] pt-6">
                <div>
                  <dt className="font-mono-tech text-[10px] text-[#8A9099]">COVERAGE</dt>
                  <dd className="mt-1 text-sm font-semibold text-[#11151B]">21 cm Lumbar</dd>
                </div>
                <div>
                  <dt className="font-mono-tech text-[10px] text-[#8A9099]">STRUCTURE</dt>
                  <dd className="mt-1 text-sm font-semibold text-[#11151B]">4 Flex Stays</dd>
                </div>
                <div>
                  <dt className="font-mono-tech text-[10px] text-[#8A9099]">WAIST FIT</dt>
                  <dd className="mt-1 text-sm font-semibold text-[#11151B]">26–48 Inches</dd>
                </div>
              </dl>
            </div>

            {/* Hero Visual Composition */}
            <div className="lg:col-span-6">
              <div className="relative aspect-[4/3] w-full overflow-hidden rounded-[28px] border border-[#E6E3DC] bg-[#F2F0EB] shadow-elevated">
                <Image
                  src={hero?.image_url ?? '/images/hero-belt.jpg'}
                  alt={hero?.image_alt ?? product.name}
                  fill
                  priority
                  fetchPriority="high"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  className="object-cover"
                />

                {/* Minimalist Floating Spec Card */}
                <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between gap-4 rounded-[18px] border border-white/60 bg-white/85 px-5 py-3.5 backdrop-blur-md">
                  <div>
                    <p className="font-mono-tech text-[10px] text-[#8A9099]">
                      FLAGSHIP MODEL · KMR-01
                    </p>
                    <p className="mt-0.5 text-sm font-semibold text-[#0E1116]">
                      {product.name}
                    </p>
                  </div>
                  <Link
                    href="/products/back-support-belt"
                    aria-label="Configure Kamora Back Support Belt"
                    className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#0E1116] text-white transition hover:bg-[#1C3D5A]"
                  >
                    <ArrowUpRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          ARCHITECTURAL TRUST & ASSURANCE HAIRLINE GRID
      ====================================================================== */}
      <section className="border-b border-[#E6E3DC] bg-white">
        <div className="mx-auto grid max-w-[1380px] divide-y divide-[#E6E3DC] sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-4">
          {[
            {
              idx: '01',
              title: 'Razorpay UPI, Cards & COD',
              detail: 'Instant INR UPI, cards, netbanking plus Cash on Delivery on eligible PINs.',
            },
            {
              idx: '02',
              title: 'Tracked India Dispatch',
              detail: `Complimentary delivery on orders above ${formatPaise(settings.free_shipping_threshold_paise)}.`,
            },
            {
              idx: '03',
              title: 'Precision Size Finder',
              detail: 'Interactive inches/cm waist calculator & 7-day size exchange.',
            },
            {
              idx: '04',
              title: 'Dedicated Concierge',
              detail: 'Real human sizing & order assistance on WhatsApp and email.',
            },
          ].map((item) => (
            <div key={item.idx} className="px-6 py-7 sm:px-8">
              <span className="font-mono-tech text-[10px] text-[#B89768]">{item.idx}</span>
              <h2 className="mt-2 font-heading text-sm font-semibold text-[#11151B]">
                {item.title}
              </h2>
              <p className="mt-1 text-xs leading-relaxed text-[#5C636E]">{item.detail}</p>
            </div>
          ))}
        </div>
      </section>

      {/* =====================================================================
          02 / INTERACTIVE OBSIDIAN ENGINEERING SHOWCASE
      ====================================================================== */}
      <EngineeringShowcase />

      {/* =====================================================================
          03 / ASYMMETRIC BENTO BENEFITS ARCHITECTURE
      ====================================================================== */}
      <section id="benefits" className="scroll-mt-20 border-b border-[#E6E3DC] bg-[#FAFAF8] py-24 sm:py-32">
        <div className="mx-auto max-w-[1380px] px-4 sm:px-8">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div className="max-w-2xl">
              <p className="font-mono-tech text-[10px] text-[#8A9099]">
                03 / EVERYDAY ERGONOMICS
              </p>
              <h2 className="mt-3 font-heading text-3xl font-semibold leading-[1.08] tracking-[-0.03em] text-[#0E1116] sm:text-5xl">
                Meet your everyday{' '}
                <span className="font-editorial italic font-normal text-[#1C3D5A]">
                  back support
                </span>{' '}
                companion.
              </h2>
            </div>
            <Link
              href="/products/back-support-belt"
              className="inline-flex items-center gap-2 text-sm font-semibold text-[#0E1116] underline decoration-[#0E1116]/25 underline-offset-8 transition hover:decoration-[#0E1116]"
            >
              Configure Size &amp; Fit <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>

          {/* Bento Grid */}
          <div className="mt-14 grid gap-5 lg:grid-cols-12">
            {/* Tall Editorial Feature Tile */}
            <div className="relative flex min-h-[420px] flex-col justify-end overflow-hidden rounded-[26px] border border-[#E6E3DC] bg-[#F2F0EB] lg:col-span-5 lg:row-span-2">
              <Image
                src="/images/belt-lifestyle.jpg"
                alt="Kamora Back Support Belt worn discreetly during everyday movement"
                fill
                loading="lazy"
                sizes="(max-width: 1024px) 100vw, 42vw"
                className="object-cover"
              />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0E1116]/85 via-[#0E1116]/20 to-transparent" />
              <div className="relative p-7 text-white">
                <p className="font-mono-tech text-[10px] text-[#D6BA8E]">
                  DISCREET PROFILE
                </p>
                <p className="mt-2 font-editorial text-3xl leading-tight">
                  Calm support under shirts, kurtas, and travel layers.
                </p>
                <p className="mt-2 text-xs leading-relaxed text-white/75">
                  Tapered front ergonomics keep seated posture natural at desks, on flights, and
                  during daily commutes.
                </p>
              </div>
            </div>

            {/* 6 Dynamic Admin-Editable Feature Tiles */}
            <div className="grid gap-5 sm:grid-cols-2 lg:col-span-7">
              {features.slice(0, 6).map((feat, idx) => (
                <div
                  key={feat.id}
                  className="flex flex-col justify-between rounded-[22px] border border-[#E6E3DC] bg-white p-6 transition hover:border-[#0E1116]/25 hover:shadow-soft"
                >
                  <div className="flex items-center justify-between">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full border border-[#E6E3DC] bg-[#FAFAF8] text-[#11151B]">
                      <FeatureIcon name={feat.icon_name} className="h-4 w-4" />
                    </span>
                    <span className="font-mono-tech text-[10px] text-[#8A9099]">
                      0{idx + 1}
                    </span>
                  </div>
                  <div className="mt-6">
                    <h3 className="font-heading text-base font-semibold text-[#11151B]">
                      {feat.title}
                    </h3>
                    <p className="mt-1.5 text-xs leading-relaxed text-[#5C636E]">
                      {feat.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          04 / THREE-STEP DAILY RITUAL (HOW IT WORKS)
      ====================================================================== */}
      <section id="how-it-works" className="scroll-mt-20 border-b border-[#E6E3DC] bg-white py-24">
        <div className="mx-auto max-w-[1380px] px-4 sm:px-8">
          <div className="max-w-xl">
            <p className="font-mono-tech text-[10px] text-[#8A9099]">04 / DAILY RITUAL</p>
            <h2 className="mt-3 font-heading text-3xl font-semibold tracking-[-0.03em] text-[#0E1116] sm:text-4xl">
              Fitted in{' '}
              <span className="font-editorial italic font-normal text-[#1C3D5A]">
                thirty seconds.
              </span>
            </h2>
          </div>

          <div className="mt-12 grid divide-y divide-[#E6E3DC] border-y border-[#E6E3DC] md:grid-cols-3 md:divide-x md:divide-y-0">
            {[
              {
                num: '01',
                title: 'Measure Around the Navel',
                body: 'Use a flexible tape in inches or centimetres while standing relaxed, and match your size cleanly from S to XXL.',
              },
              {
                num: '02',
                title: 'Centre & Dial Tension',
                body: 'Align the contoured rear panel over your lumbar curve over a thin cotton layer, fasten the inner band, and pull both side straps evenly.',
              },
              {
                num: '03',
                title: 'Wear Across Real Routines',
                body: 'Incorporate into desk sessions, commutes, household chores, or evening walks — loosening smoothly whenever you rest.',
              },
            ].map((step) => (
              <div key={step.num} className="py-8 md:px-8 md:first:pl-0 md:last:pr-0">
                <span className="font-editorial text-5xl text-[#B89768]">{step.num}</span>
                <h3 className="mt-4 font-heading text-lg font-semibold text-[#11151B]">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-[#5C636E]">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* =====================================================================
          05 / EDITORIAL CAMPAIGN: THE COMPLETE BACK COMFORT KIT
      ====================================================================== */}
      {comfortKitOffer && (
        <section
          id="comfort-kit"
          className="scroll-mt-20 border-b border-[#E6E3DC] bg-[#F2F0EB] py-24 sm:py-28"
        >
          <div className="mx-auto max-w-[1380px] px-4 sm:px-8">
            <div className="overflow-hidden rounded-[30px] border border-[#E6E3DC] bg-white shadow-elevated">
              <div className="grid lg:grid-cols-12">
                <div className="relative min-h-[340px] bg-[#F2F0EB] lg:col-span-6">
                  <Image
                    src="/images/comfort-kit.jpg"
                    alt="The Complete Back Comfort Kit flat-lay with lumbar belt, storage pouch, and usage card"
                    fill
                    loading="lazy"
                    sizes="(max-width: 1024px) 100vw, 50vw"
                    className="object-cover"
                  />
                </div>

                <div className="flex flex-col justify-between p-8 sm:p-12 lg:col-span-6">
                  <div>
                    <Badge variant="champagne">
                      <Sparkles className="h-3 w-3" />
                      {comfortKitOffer.badge_text ?? 'LAUNCH EDITION'}
                    </Badge>
                    <p className="font-mono-tech mt-5 text-[10px] text-[#8A9099]">
                      {comfortKitOffer.name}
                    </p>
                    <h2 className="mt-2 font-heading text-2xl font-semibold leading-tight tracking-[-0.03em] text-[#0E1116] sm:text-4xl">
                      {comfortKitOffer.headline}
                    </h2>
                    {comfortKitOffer.description && (
                      <p className="mt-3 text-sm leading-relaxed text-[#5C636E]">
                        {comfortKitOffer.description}
                      </p>
                    )}

                    <ul className="mt-7 divide-y divide-[#E6E3DC] border-y border-[#E6E3DC]">
                      {(comfortKitOffer.items ?? [])
                        .filter((i) => i.is_included)
                        .map((item) => (
                          <li
                            key={item.id}
                            className="flex items-center justify-between gap-4 py-3.5 text-sm"
                          >
                            <div className="flex items-start gap-2.5">
                              <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#0E1116]" />
                              <div>
                                <p className="font-medium text-[#11151B]">{item.item_title}</p>
                                {item.item_description && (
                                  <p className="text-xs text-[#8A9099]">
                                    {item.item_description}
                                  </p>
                                )}
                              </div>
                            </div>
                            {item.item_type !== 'primary_product' && (
                              <span className="font-mono-tech shrink-0 text-[10px] text-emerald-700">
                                INCLUDED
                              </span>
                            )}
                          </li>
                        ))}
                    </ul>
                  </div>

                  <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <div className="flex items-baseline gap-2.5">
                        <span className="font-heading text-3xl font-bold text-[#0E1116]">
                          {formatPaise(product.sale_price_paise)}
                        </span>
                        <span className="text-sm text-[#8A9099] line-through">
                          {formatPaise(product.mrp_paise)}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-[#5C636E]">
                        Save {formatPaise(product.mrp_paise - product.sale_price_paise)} · GST
                        included · Free India shipping
                      </p>
                    </div>

                    <Link href="/products/back-support-belt">
                      <Button variant="primary" size="lg">
                        {comfortKitOffer.cta_text ?? 'Get Your Comfort Kit'}
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            {/* Optional Family Comfort Add-On */}
            {familyAddonOffer && (
              <div className="mt-5 flex flex-col items-start justify-between gap-4 rounded-[22px] border border-[#E6E3DC] bg-white px-7 py-5 sm:flex-row sm:items-center">
                <div>
                  <span className="font-mono-tech text-[10px] text-[#B89768]">
                    OPTIONAL · {familyAddonOffer.name}
                  </span>
                  <p className="mt-1 font-heading text-base font-semibold text-[#11151B]">
                    {familyAddonOffer.headline}
                  </p>
                  {familyAddonOffer.description && (
                    <p className="mt-0.5 text-xs text-[#5C636E]">
                      {familyAddonOffer.description}
                    </p>
                  )}
                </div>
                <Link href="/products/back-support-belt" className="shrink-0">
                  <Button variant="outline" size="md">
                    {familyAddonOffer.cta_text ?? 'Add 2nd Belt'}
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </section>
      )}

      {/* =====================================================================
          06 / EDITORIAL LOOKBOOK GALLERY & INTENDED USE CASES
      ====================================================================== */}
      <section className="border-b border-[#E6E3DC] bg-white py-24">
        <div className="mx-auto max-w-[1380px] px-4 sm:px-8">
          <div className="grid gap-10 lg:grid-cols-12 lg:items-end">
            <div className="lg:col-span-6">
              <p className="font-mono-tech text-[10px] text-[#8A9099]">
                05 / INDUSTRIAL DESIGN &amp; USE CASES
              </p>
              <h2 className="mt-3 font-heading text-3xl font-semibold tracking-[-0.03em] text-[#0E1116] sm:text-4xl">
                Built around{' '}
                <span className="font-editorial italic font-normal text-[#1C3D5A]">
                  real Indian routines.
                </span>
              </h2>
            </div>
            <p className="text-sm leading-relaxed text-[#5C636E] lg:col-span-6">
              {product.usage_recommendations}
            </p>
          </div>

          {/* Asymmetric Lookbook */}
          <div className="mt-12 grid gap-5 md:grid-cols-12">
            {images.slice(0, 4).map((img, i) => (
              <figure
                key={img.id}
                className={`group overflow-hidden rounded-[24px] border border-[#E6E3DC] bg-[#FAFAF8] ${
                  i === 0 || i === 3 ? 'md:col-span-7' : 'md:col-span-5'
                }`}
              >
                <div className="relative aspect-[16/10] w-full overflow-hidden">
                  <Image
                    src={img.url}
                    alt={img.alt_text}
                    fill
                    loading="lazy"
                    sizes="(max-width: 768px) 100vw, 55vw"
                    className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
                  />
                </div>
                {img.caption && (
                  <figcaption className="flex items-center justify-between px-5 py-3.5">
                    <span className="text-xs font-medium text-[#11151B]">{img.caption}</span>
                    <span className="font-mono-tech text-[10px] text-[#8A9099]">
                      FIG 0{i + 1}
                    </span>
                  </figcaption>
                )}
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* =====================================================================
          07 / GENUINE VERIFIED REVIEWS
      ====================================================================== */}
      <div className="border-b border-[#E6E3DC] bg-[#FAFAF8] py-24">
        <div className="mx-auto max-w-[1380px] px-4 sm:px-8">
          <ReviewSection
            productId={product.id}
            reviews={reviews}
            averageRating={averageRating}
          />
        </div>
      </div>

      {/* =====================================================================
          08 / EDITORIAL FAQ
      ====================================================================== */}
      <section className="border-b border-[#E6E3DC] bg-white py-24">
        <div className="mx-auto max-w-4xl px-4 sm:px-8">
          <div className="mb-12">
            <p className="font-mono-tech text-[10px] text-[#8A9099]">06 / QUESTIONS</p>
            <h2 className="mt-3 font-heading text-3xl font-semibold tracking-[-0.03em] text-[#0E1116] sm:text-4xl">
              Everything you need to know.
            </h2>
          </div>
          <FaqAccordion faqs={faqs} />
        </div>
      </section>

      {/* =====================================================================
          09 / FINAL ARCHITECTURAL CTA
      ====================================================================== */}
      <section className="bg-[#F2F0EB] py-24 sm:py-28">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-8">
          <p className="font-mono-tech text-[10px] text-[#B89768]">
            {finalCta?.eyebrow ?? 'KAMORA LUMBAR SERIES'}
          </p>
          <h2 className="mt-4 font-heading text-4xl font-semibold leading-[1.05] tracking-[-0.035em] text-[#0E1116] sm:text-6xl">
            Make comfort part of{' '}
            <span className="font-editorial italic font-normal text-[#1C3D5A]">
              your everyday.
            </span>
          </h2>
          <p className="mx-auto mt-5 max-w-lg text-sm leading-relaxed text-[#5C636E] sm:text-base">
            {finalCta?.subheadline ??
              'Breathable architectural lumbar support with dual-tension adjustment, interactive waist sizing, and pan-India delivery.'}
          </p>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-3.5">
            <Link href={finalCta?.primary_cta_href ?? '/products/back-support-belt'}>
              <Button variant="primary" size="lg">
                {finalCta?.primary_cta_label ?? 'Shop the Back Support Belt'}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/track-order">
              <Button variant="secondary" size="lg">
                Track Existing Order
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

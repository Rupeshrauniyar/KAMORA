import type { Metadata } from 'next';
import Link from 'next/link';
import { ChevronRight, CheckCircle2, Package, ShieldAlert, Truck, RotateCcw } from 'lucide-react';
import {
  getFaqs,
  getFlagshipProductBundle,
  getPublishedBlogPosts,
  getStoreSettings,
} from '@/lib/data/storefront';
import { ProductGallery } from '@/components/product/product-gallery';
import { ProductPurchasePanel } from '@/components/product/product-purchase-panel';
import { FeatureIcon } from '@/components/storefront/feature-icon';
import { ReviewSection } from '@/components/product/review-section';
import { FaqAccordion } from '@/components/storefront/faq-accordion';

export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  const { product, images } = await getFlagshipProductBundle('back-support-belt');
  return {
    title: product.seo_title ?? product.name,
    description: product.seo_description ?? product.short_description,
    openGraph: {
      title: product.seo_title ?? product.name,
      description: product.seo_description ?? product.short_description,
      images: images[0]?.url ? [{ url: images[0].url, alt: images[0].alt_text }] : undefined,
    },
  };
}

export default async function BackSupportBeltPage() {
  const [bundle, faqs, posts, settings] = await Promise.all([
    getFlagshipProductBundle('back-support-belt'),
    getFaqs('product'),
    getPublishedBlogPosts(),
    getStoreSettings(),
  ]);

  const { product, variants, images, features, sizeGuides, offers, reviews, averageRating, reviewCount } =
    bundle;

  const siteUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://kamora.in';
  const totalAvailable = variants.reduce((s, v) => s + (v.available_stock ?? 0), 0);

  const productJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.short_description,
    image: images.map((img) => `${siteUrl}${img.url}`),
    brand: { '@type': 'Brand', name: settings.brand_name },
    sku: variants[0]?.sku ?? 'KMR-BSB',
    offers: {
      '@type': 'Offer',
      url: `${siteUrl}/products/${product.slug}`,
      priceCurrency: 'INR',
      price: (product.sale_price_paise / 100).toFixed(2),
      availability:
        totalAvailable > 0
          ? 'https://schema.org/InStock'
          : 'https://schema.org/OutOfStock',
    },
    ...(averageRating && reviewCount > 0
      ? {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: averageRating,
            reviewCount,
          },
        }
      : {}),
  };

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: siteUrl },
      {
        '@type': 'ListItem',
        position: 2,
        name: product.name,
        item: `${siteUrl}/products/${product.slug}`,
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      <div className="bg-[#FAFAF8] pb-24 lg:pb-20">
        {/* Breadcrumb */}
        <div className="border-b border-[#E6E3DC] bg-white">
          <nav
            aria-label="Breadcrumb"
            className="mx-auto flex max-w-[1380px] items-center gap-2 px-4 py-3 text-xs text-[#8A9099] sm:px-8"
          >
            <Link href="/" className="hover:text-[#0E1116]">
              Home
            </Link>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="font-medium text-[#11151B]">{product.name}</span>
          </nav>
        </div>

        {/* Main 2-Column Configurator */}
        <section className="mx-auto max-w-[1380px] px-4 pt-8 sm:px-8 lg:pt-12">
          <div className="grid gap-12 lg:grid-cols-12 lg:items-start">
            <div className="lg:col-span-7">
              <ProductGallery images={images} />

              <div className="mt-10 rounded-[26px] border border-[#E6E3DC] bg-white p-8">
                <p className="font-mono-tech text-[10px] text-[#8A9099]">
                  DESIGN PHILOSOPHY
                </p>
                <h2 className="mt-2 font-heading text-2xl font-semibold tracking-[-0.03em] text-[#0E1116]">
                  Thoughtfully engineered for{' '}
                  <span className="font-editorial italic font-normal text-[#1C3D5A]">
                    everyday movement.
                  </span>
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-[#5C636E]">
                  {product.description}
                </p>

                <div className="mt-7 grid gap-4 sm:grid-cols-2">
                  {features.slice(0, 6).map((feat) => (
                    <div
                      key={feat.id}
                      className="flex items-start gap-3 rounded-[16px] border border-[#E6E3DC] bg-[#FAFAF8] p-4"
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#E6E3DC] bg-white text-[#11151B]">
                        <FeatureIcon name={feat.icon_name} className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-heading text-sm font-semibold text-[#11151B]">
                          {feat.title}
                        </p>
                        <p className="mt-1 text-xs leading-relaxed text-[#5C636E]">
                          {feat.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="lg:col-span-5">
              <ProductPurchasePanel
                product={product}
                variants={variants}
                images={images}
                sizeGuides={sizeGuides}
                offers={offers}
                averageRating={averageRating}
                reviewCount={reviewCount}
              />
            </div>
          </div>
        </section>

        {/* How to Wear */}
        <section id="comfort-kit" className="mx-auto mt-16 max-w-[1380px] px-4 sm:px-8">
          <div className="rounded-[28px] bg-[#0E1116] p-8 text-white sm:p-12">
            <p className="font-mono-tech text-[10px] text-[#D6BA8E]">
              FITTING DEMONSTRATION
            </p>
            <h2 className="mt-3 font-heading text-2xl font-semibold tracking-[-0.03em] sm:text-4xl">
              How to wear your{' '}
              <span className="font-editorial italic font-normal text-[#D6BA8E]">
                Kamora belt.
              </span>
            </h2>
            <div className="mt-10 grid gap-6 md:grid-cols-3">
              {[
                {
                  num: '01',
                  step: 'Align Rear Panel',
                  detail:
                    'Wear a thin cotton T-shirt or inner layer. Centre the contoured rear panel across the curve of your lower back so the lower edge sits cleanly above the hips.',
                },
                {
                  num: '02',
                  step: 'Fasten Inner Wrap',
                  detail:
                    'Bring the primary waist bands across your abdomen and secure flush with the snag-free micro-hook closure while breathing normally.',
                },
                {
                  num: '03',
                  step: 'Dial Dual Tension',
                  detail:
                    'Pull both outer compression straps forward evenly to set firm or gentle lumbar support. Loosen smoothly during long seated stretches.',
                },
              ].map((s) => (
                <div
                  key={s.num}
                  className="rounded-[20px] border border-white/10 bg-white/[0.04] p-6"
                >
                  <span className="font-editorial text-4xl text-[#D6BA8E]">{s.num}</span>
                  <h3 className="mt-3 font-heading text-base font-semibold text-white">
                    {s.step}
                  </h3>
                  <p className="mt-2 text-xs leading-relaxed text-white/65">{s.detail}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* What's Included + Technical Specs */}
        <section className="mx-auto mt-12 max-w-[1380px] px-4 sm:px-8">
          <div className="grid gap-8 lg:grid-cols-12">
            <div className="rounded-[26px] border border-[#E6E3DC] bg-white p-8 lg:col-span-5">
              <div className="font-mono-tech flex items-center gap-2 text-[10px] text-[#8A9099]">
                <Package className="h-3.5 w-3.5 text-[#B89768]" />
                IN THE BOX
              </div>
              <ul className="mt-5 divide-y divide-[#E6E3DC] border-y border-[#E6E3DC]">
                {product.whats_included.map((item) => (
                  <li key={item.title} className="flex items-start gap-3 py-4">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#0E1116]" />
                    <div>
                      <p className="text-sm font-semibold text-[#11151B]">{item.title}</p>
                      <p className="mt-0.5 text-xs text-[#5C636E]">{item.detail}</p>
                    </div>
                  </li>
                ))}
              </ul>

              <div className="mt-6 space-y-3 text-xs text-[#5C636E]">
                <div className="flex items-start gap-2.5">
                  <Truck className="mt-0.5 h-4 w-4 shrink-0 text-[#0E1116]" />
                  <p>
                    <strong className="text-[#11151B]">Dispatch:</strong> Packed and dispatched
                    within 24–48 business hours with tracked pan-India delivery.
                  </p>
                </div>
                <div className="flex items-start gap-2.5">
                  <RotateCcw className="mt-0.5 h-4 w-4 shrink-0 text-[#0E1116]" />
                  <p>
                    <strong className="text-[#11151B]">Returns &amp; Exchanges:</strong>{' '}
                    {settings.return_window_days}-day return and size exchange window for unused
                    items in original packaging.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-[26px] border border-[#E6E3DC] bg-white p-8 lg:col-span-7">
              <p className="font-mono-tech text-[10px] text-[#8A9099]">SPECIFICATIONS</p>
              <h2 className="mt-2 font-heading text-2xl font-semibold text-[#0E1116]">
                Technical Architecture
              </h2>
              <dl className="mt-5 divide-y divide-[#E6E3DC] text-sm">
                {product.specifications.map((spec) => (
                  <div
                    key={spec.label}
                    className="grid grid-cols-1 gap-1 py-3.5 sm:grid-cols-3 sm:gap-4"
                  >
                    <dt className="text-[#5C636E]">{spec.label}</dt>
                    <dd className="font-medium text-[#11151B] sm:col-span-2">{spec.value}</dd>
                  </div>
                ))}
              </dl>

              <div className="mt-6 grid gap-5 border-t border-[#E6E3DC] pt-6 sm:grid-cols-2">
                <div>
                  <h3 className="font-mono-tech text-[10px] text-[#8A9099]">MATERIALS</h3>
                  <p className="mt-2 text-xs leading-relaxed text-[#5C636E]">
                    {product.material_info}
                  </p>
                </div>
                <div>
                  <h3 className="font-mono-tech text-[10px] text-[#8A9099]">CARE</h3>
                  <p className="mt-2 text-xs leading-relaxed text-[#5C636E]">
                    {product.care_instructions}
                  </p>
                </div>
              </div>

              <div className="mt-6 flex items-start gap-3 rounded-[16px] border border-[#E6E3DC] bg-[#FAFAF8] p-4 text-xs leading-relaxed text-[#5C636E]">
                <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-[#B89768]" />
                <p>{product.usage_recommendations}</p>
              </div>
            </div>
          </div>
        </section>

        {/* Verified Reviews */}
        <section className="mx-auto mt-20 max-w-[1380px] px-4 sm:px-8">
          <ReviewSection
            productId={product.id}
            reviews={reviews}
            averageRating={averageRating}
          />
        </section>

        {/* FAQs */}
        <section className="mx-auto mt-20 max-w-4xl px-4 sm:px-8">
          <p className="font-mono-tech text-[10px] text-[#8A9099]">PRODUCT FAQ</p>
          <h2 className="mt-2 font-heading text-3xl font-semibold text-[#0E1116]">
            Questions &amp; Sizing Guidance
          </h2>
          <div className="mt-8">
            <FaqAccordion faqs={faqs} />
          </div>
        </section>

        {/* Related Guides */}
        {posts.length > 0 && (
          <section className="mx-auto mt-20 max-w-[1380px] px-4 sm:px-8">
            <div className="flex items-end justify-between">
              <div>
                <p className="font-mono-tech text-[10px] text-[#8A9099]">JOURNAL</p>
                <h2 className="mt-2 font-heading text-2xl font-semibold text-[#0E1116]">
                  Lumbar Care &amp; Fit Reading
                </h2>
              </div>
              <Link
                href="/blog"
                className="text-xs font-semibold text-[#0E1116] underline underline-offset-4"
              >
                All Articles
              </Link>
            </div>
            <div className="mt-6 grid gap-5 md:grid-cols-3">
              {posts.slice(0, 3).map((post) => (
                <Link
                  key={post.id}
                  href={`/blog/${post.slug}`}
                  className="group rounded-[22px] border border-[#E6E3DC] bg-white p-6 transition hover:border-[#0E1116]/30 hover:shadow-soft"
                >
                  <span className="font-mono-tech text-[10px] text-[#B89768]">
                    {post.category} · {post.read_time_minutes} MIN
                  </span>
                  <h3 className="mt-2.5 font-heading text-base font-semibold text-[#11151B] group-hover:text-[#1C3D5A]">
                    {post.title}
                  </h3>
                  <p className="mt-2 text-xs leading-relaxed text-[#5C636E]">{post.excerpt}</p>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </>
  );
}

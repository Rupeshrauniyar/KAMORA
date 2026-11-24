import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { getBlogPostBySlug } from '@/lib/data/storefront';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatISTDate } from '@/lib/utils/format';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getBlogPostBySlug(slug);
  if (!post) return { title: 'Article Not Found' };

  return {
    title: post.seo_title ?? post.title,
    description: post.seo_description ?? post.excerpt,
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getBlogPostBySlug(slug);
  if (!post) notFound();

  const siteUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://kamora.in';
  const articleJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.excerpt,
    author: { '@type': 'Organization', name: post.author_name },
    datePublished: post.published_at,
    mainEntityOfPage: `${siteUrl}/blog/${post.slug}`,
  };

  const blocks = post.content_markdown.split('\n\n');

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />
      <article className="bg-[#FAFAF8] py-14">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <Link
            href="/blog"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1C3D5A] hover:underline"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Wellness Journal
          </Link>

          <div className="mt-5">
            <Badge variant="default">
              {post.category} · {post.read_time_minutes} min read
            </Badge>
            <h1 className="mt-3 font-heading text-3xl font-bold leading-tight text-[#11151B] sm:text-4xl">
              {post.title}
            </h1>
            <p className="mt-3 text-xs text-[#5C636E]">
              By {post.author_name}
              {post.published_at ? ` · Published ${formatISTDate(post.published_at)}` : ''}
            </p>
          </div>

          {post.cover_image_url && (
            <div className="relative mt-8 aspect-[16/10] w-full overflow-hidden rounded-[22px] border border-[#E6E3DC] bg-white shadow-soft">
              <Image
                src={post.cover_image_url}
                alt={post.title}
                fill
                sizes="(max-width: 768px) 100vw, 768px"
                className="object-cover"
              />
            </div>
          )}

          <div className="mt-8 space-y-5 rounded-[22px] border border-[#E6E3DC] bg-white p-7 text-[15px] leading-relaxed text-[#11151B] shadow-soft sm:p-9">
            {blocks.map((block, idx) => {
              if (block.startsWith('## ')) {
                return (
                  <h2 key={idx} className="pt-2 font-heading text-xl font-bold text-[#11151B]">
                    {block.replace(/^##\s+/, '')}
                  </h2>
                );
              }
              if (block.startsWith('- ')) {
                const items = block.split('\n').map((line) => line.replace(/^-\s+/, ''));
                return (
                  <ul key={idx} className="list-disc space-y-2 pl-5 text-sm text-[#5C636E]">
                    {items.map((item, i) => (
                      <li key={i}>{item.replaceAll('**', '')}</li>
                    ))}
                  </ul>
                );
              }
              return (
                <p key={idx} className="text-sm leading-relaxed text-[#5C636E]">
                  {block}
                </p>
              );
            })}
          </div>

          <div className="mt-8 flex flex-col items-center justify-between gap-4 rounded-[20px] border border-[#E6E3DC] bg-[#F2F0EB] p-6 sm:flex-row">
            <div>
              <p className="font-heading text-base font-bold text-[#11151B]">
                Ready to experience everyday lumbar comfort?
              </p>
              <p className="text-xs text-[#5C636E]">
                Explore the Kamora Adjustable Back Support Belt and find your exact waist fit.
              </p>
            </div>
            <Link href="/products/back-support-belt">
              <Button variant="primary">
                Shop Now <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </article>
    </>
  );
}

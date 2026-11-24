import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight } from 'lucide-react';
import { getPublishedBlogPosts } from '@/lib/data/storefront';
import { Badge } from '@/components/ui/badge';
import { formatISTDate } from '@/lib/utils/format';

export const metadata: Metadata = {
  title: 'Wellness Journal — Lumbar Support & Posture Guides',
  description:
    'Educational articles on understanding lumbar support, measuring and fitting a back support belt, everyday posture habits, and product care.',
};

export default async function BlogIndexPage() {
  const posts = await getPublishedBlogPosts();

  return (
    <div className="bg-[#FAFAF8] py-14">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <Badge variant="default">Kamora Wellness Journal</Badge>
          <h1 className="mt-3 font-heading text-3xl font-bold text-[#11151B] sm:text-4xl">
            Practical Lumbar Care &amp; Everyday Movement Guides
          </h1>
          <p className="mt-2 text-sm text-[#5C636E]">
            Informative, grounded articles on choosing the right fit, caring for your belt, and
            building comfortable everyday posture habits.
          </p>
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {posts.map((post) => (
            <Link
              key={post.id}
              href={`/blog/${post.slug}`}
              className="group flex flex-col overflow-hidden rounded-[20px] border border-[#E6E3DC] bg-white shadow-soft transition hover:-translate-y-0.5 hover:border-[#0E1116]/30"
            >
              {post.cover_image_url && (
                <div className="relative aspect-[4/3] w-full overflow-hidden bg-[#F2F0EB]">
                  <Image
                    src={post.cover_image_url}
                    alt={post.title}
                    fill
                    sizes="(max-width: 768px) 100vw, 33vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                  />
                </div>
              )}
              <div className="flex flex-1 flex-col justify-between p-6">
                <div>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-[#1C3D5A]">
                    {post.category} · {post.read_time_minutes} min read
                  </span>
                  <h2 className="mt-2 font-heading text-lg font-bold text-[#11151B] group-hover:text-[#1C3D5A]">
                    {post.title}
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed text-[#5C636E]">
                    {post.excerpt}
                  </p>
                </div>
                <div className="mt-5 flex items-center justify-between border-t border-[#E6E3DC]/80 pt-3.5 text-xs text-[#5C636E]">
                  <span>{post.published_at ? formatISTDate(post.published_at) : ''}</span>
                  <span className="inline-flex items-center gap-1 font-semibold text-[#1C3D5A]">
                    Read <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

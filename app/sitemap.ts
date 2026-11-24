import type { MetadataRoute } from 'next';
import { getPublishedBlogPosts } from '@/lib/data/storefront';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://kamora.in';
  const posts = await getPublishedBlogPosts();

  const staticRoutes = [
    '',
    '/products/back-support-belt',
    '/about',
    '/contact',
    '/faq',
    '/blog',
    '/track-order',
    '/shipping-policy',
    '/returns-policy',
    '/privacy-policy',
    '/terms',
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: (route === '' || route.includes('products') ? 'weekly' : 'monthly') as
      | 'weekly'
      | 'monthly',
    priority: route === '' ? 1 : route.includes('products') ? 0.95 : 0.7,
  }));

  const blogRoutes = posts.map((post) => ({
    url: `${baseUrl}/blog/${post.slug}`,
    lastModified: post.published_at ? new Date(post.published_at) : new Date(),
    changeFrequency: 'monthly' as const,
    priority: 0.75,
  }));

  return [...staticRoutes, ...blogRoutes];
}

import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://kamora.in';
  return {
    rules: [ 
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin/', '/api/', '/account/', '/cart', '/checkout', '/order-success'],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}

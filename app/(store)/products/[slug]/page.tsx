import { redirect } from 'next/navigation';

export default async function DynamicProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (slug === 'back-support-belt') {
    redirect('/products/back-support-belt');
  }
  redirect('/products/back-support-belt');
}

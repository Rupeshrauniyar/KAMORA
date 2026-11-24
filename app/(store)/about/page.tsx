import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = {
  title: 'About Kamora',
  description:
    'Learn how Kamora designs breathable, modern everyday lumbar support crafted for Indian lifestyles and climates.',
};

export default function AboutPage() {
  return (
    <div className="bg-[#FAFAF8]">
      <section className="bg-architectural-hero border-b border-[#E6E3DC] py-20">
        <div className="mx-auto max-w-5xl px-4 text-center sm:px-6">
          <Badge variant="champagne">Our Story</Badge>
          <h1 className="mt-4 font-heading text-4xl font-bold text-[#11151B] sm:text-5xl">
            Modern Orthopedic Wellness, Stripped of Hospital Coldness.
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-[#5C636E]">
            Kamora was created around one clear conviction: everyday lumbar support should feel
            breathable, dignified, and effortless — never bulky, hot, or clinical.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid items-center gap-10 lg:grid-cols-12">
          <div className="relative aspect-[4/3] overflow-hidden rounded-[24px] border border-[#E6E3DC] bg-white shadow-soft lg:col-span-6">
            <Image
              src="/images/belt-lifestyle.jpg"
              alt="Kamora Adjustable Back Support Belt worn comfortably in everyday life"
              fill
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover"
            />
          </div>
          <div className="space-y-4 lg:col-span-6">
            <h2 className="font-heading text-2xl font-bold text-[#11151B]">
              Focused on One Flagship Craft
            </h2>
            <p className="text-sm leading-relaxed text-[#5C636E]">
              Instead of scattering focus across dozens of generic catalog items, Kamora dedicates
              its engineering and material sourcing to perfecting one everyday essential: the
              Kamora Adjustable Back Support Belt.
            </p>
            <ul className="space-y-2.5 pt-2 text-sm text-[#11151B]">
              {[
                'Perforated air-mesh tailored for warm, humid Indian climates',
                'Dual-pull compression adjustment for smooth transitions between sitting and standing',
                'Honest sizing guidance and 7-day size exchange support across India',
                'Responsible product education without exaggerated medical promises',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2.5">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#1C3D5A]" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <div className="pt-4">
              <Link href="/products/back-support-belt">
                <Button variant="primary" size="lg">
                  Discover the Back Support Belt <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

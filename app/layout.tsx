import type { Metadata, Viewport } from 'next';
import {
  Plus_Jakarta_Sans,
  Instrument_Serif,
  JetBrains_Mono,
} from 'next/font/google';
import './globals.css';
import { CartProvider } from '@/components/cart/cart-provider';
import { AuthProvider } from '@/components/auth/auth-provider';
import { NavigationProgress } from '@/components/layout/navigation-progress';

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-jakarta',
  display: 'swap',
});

const instrumentSerif = Instrument_Serif({
  subsets: ['latin'],
  weight: ['400'],
  style: ['normal', 'italic'],
  variable: '--font-instrument',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-jetbrains',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'),
  title: {
    default: 'Kamora — Architectural Lumbar Support | Everyday Back Comfort',
    template: '%s | Kamora',
  },
  description:
    'Precision-engineered adjustable back support belt crafted for breathable everyday lumbar comfort, modern posture awareness, and effortless movement across India.',
  keywords: [
    'back support belt India',
    'adjustable lumbar support belt',
    'ergonomic back support',
    'lower back support belt',
    'Kamora wellness',
  ],
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    siteName: 'Kamora',
    title: 'Kamora — Move Freely. Live Fully.',
    description:
      'Architectural everyday lumbar support designed for Indian climates and modern movement.',
    images: [{ url: '/images/hero-belt.jpg', width: 1200, height: 900, alt: 'Kamora Back Support Belt' }],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#FAFAF8',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en-IN"
      className={`${jakarta.variable} ${instrumentSerif.variable} ${jetbrainsMono.variable}`}
    >
      <body className="min-h-screen bg-[#FAFAF8] text-[#11151B] antialiased selection:bg-[#0E1116] selection:text-white">
        <NavigationProgress />
        <AuthProvider>
          <CartProvider>{children}</CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}

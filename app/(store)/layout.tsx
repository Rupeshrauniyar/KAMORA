import { AnnouncementBar } from '@/components/layout/announcement-bar';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { WhatsAppFloat } from '@/components/layout/whatsapp-button';
import { PageTransition } from '@/components/layout/page-transition';
import { getActiveAnnouncements, getStoreSettings } from '@/lib/data/storefront';

export default async function StorefrontLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [settings, announcements] = await Promise.all([
    getStoreSettings(),
    getActiveAnnouncements(),
  ]);

  return (
    <div className="flex min-h-screen flex-col">
      <AnnouncementBar announcements={announcements} />
      <Navbar brandName={settings.brand_name} />
      <main className="flex-1">
        <PageTransition>{children}</PageTransition>
      </main>
      <Footer settings={settings} />
      <WhatsAppFloat
        whatsappNumber={settings.whatsapp_number}
        brandName={settings.brand_name}
      />
    </div>
  );
}

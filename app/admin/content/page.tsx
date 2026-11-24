import { requireAdmin } from '@/lib/auth/admin';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import {
  updateBannerAction,
  createAnnouncementAction,
  createFaqAction,
} from '@/actions/admin/mutations';
import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/card';

export default async function AdminContentPage() {
  await requireAdmin(['super_admin', 'admin', 'content_manager']);
  const admin = createAdminSupabaseClient();

  const [{ data: banners }, { data: announcements }, { data: faqs }] = await Promise.all([
    admin.from('banners').select('*'),
    admin.from('announcements').select('*').order('sort_order', { ascending: true }),
    admin.from('faqs').select('*').order('sort_order', { ascending: true }),
  ]);

  const hero = banners?.find((b) => b.slot === 'hero');

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-heading text-xl font-bold text-[#11151B]">
          Storefront Content &amp; CMS
        </h2>
        <p className="text-xs text-[#5C636E]">
          Update homepage hero copy, announcement bar messages, and FAQs live without a code
          deployment.
        </p>
      </div>

      {/* Hero Banner Editor */}
      {hero && (
        <form
          action={async (fd) => {
            'use server';
            await updateBannerAction(fd);
          }}
          className="space-y-4 rounded-[20px] border border-[#E6E3DC] bg-white p-6 shadow-soft"
        >
          <input type="hidden" name="slot" value="hero" />
          <h3 className="font-heading text-base font-bold text-[#11151B]">
            Homepage Hero Section
          </h3>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold">Eyebrow Label</label>
              <Input name="eyebrow" defaultValue={hero.eyebrow ?? ''} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold">Hero Headline</label>
              <Input name="headline" defaultValue={hero.headline} required />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold">Primary CTA Label</label>
              <Input name="primary_cta_label" defaultValue={hero.primary_cta_label ?? ''} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold">Secondary CTA Label</label>
              <Input name="secondary_cta_label" defaultValue={hero.secondary_cta_label ?? ''} />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold">Hero Supporting Copy</label>
            <Textarea name="subheadline" defaultValue={hero.subheadline ?? ''} />
          </div>
          <Button type="submit" variant="primary">
            Publish Hero Update
          </Button>
        </form>
      )}

      {/* Announcement Bar */}
      <div className="rounded-[20px] border border-[#E6E3DC] bg-white p-6 shadow-soft space-y-4">
        <h3 className="font-heading text-base font-bold text-[#11151B]">
          Announcement Bar ({announcements?.length ?? 0})
        </h3>
        <form
          action={async (fd) => {
            'use server';
            await createAnnouncementAction(fd);
          }}
          className="grid gap-3 md:grid-cols-12"
        >
          <div className="md:col-span-6">
            <Input name="message" required placeholder="Add a new announcement banner..." />
          </div>
          <div className="md:col-span-2">
            <Input name="link_label" placeholder="Link label" />
          </div>
          <div className="md:col-span-2">
            <Input name="link_href" placeholder="/products/back-support-belt" />
          </div>
          <div className="md:col-span-2">
            <Button type="submit" variant="secondary" className="w-full">
              Add Banner
            </Button>
          </div>
        </form>
        <ul className="divide-y divide-[#E6E3DC] text-sm">
          {(announcements ?? []).map((a) => (
            <li key={a.id} className="py-2.5 text-[#11151B]">
              {a.message}
            </li>
          ))}
        </ul>
      </div>

      {/* Add FAQ */}
      <div className="rounded-[20px] border border-[#E6E3DC] bg-white p-6 shadow-soft space-y-4">
        <h3 className="font-heading text-base font-bold text-[#11151B]">
          Publish New FAQ ({faqs?.length ?? 0} live)
        </h3>
        <form
          action={async (fd) => {
            'use server';
            await createFaqAction(fd);
          }}
          className="space-y-3"
        >
          <div className="grid gap-3 md:grid-cols-4">
            <Input name="category" defaultValue="Product" placeholder="Category" />
            <div className="md:col-span-3">
              <Input name="question" required placeholder="Customer question..." />
            </div>
          </div>
          <Textarea name="answer" required placeholder="Clear, responsible answer..." />
          <Button type="submit" variant="primary">
            Add FAQ to Storefront
          </Button>
        </form>
      </div>
    </div>
  );
}

import { requireAdmin } from '@/lib/auth/admin';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { updateProductAction, updateVariantPriceAction } from '@/actions/admin/mutations';
import { Button } from '@/components/ui/button';
import { Input, Select, Textarea } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default async function AdminProductsPage() {
  await requireAdmin(['super_admin', 'admin', 'content_manager', 'inventory_manager']);
  const admin = createAdminSupabaseClient();

  const { data: products } = await admin
    .from('products')
    .select('*, variants:product_variants(*), images:product_images(*)')
    .order('is_flagship', { ascending: false });

  const product = products?.[0];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-heading text-xl font-bold text-[#11151B]">
          Product &amp; Variant Management
        </h2>
        <p className="text-xs text-[#5C636E]">
          Edit product copy, INR pricing, SEO metadata, and size variant availability. All updates
          immediately revalidate the live storefront.
        </p>
      </div>

      {!product ? (
        <div className="rounded-[18px] border border-[#E6E3DC] bg-white p-8 text-sm text-[#5C636E]">
          No products found. Run <code>supabase/seed.sql</code> to initialize the flagship Back
          Support Belt catalog.
        </div>
      ) : (
        <>
          {/* Core Product Form */}
          <form
            action={async (fd) => {
              'use server';
              await updateProductAction(fd);
            }}
            className="space-y-5 rounded-[20px] border border-[#E6E3DC] bg-white p-6 shadow-soft"
          >
            <input type="hidden" name="product_id" value={product.id} />
            <div className="flex items-center justify-between">
              <h3 className="font-heading text-base font-bold text-[#11151B]">
                {product.name}
              </h3>
              <Badge variant="default">{product.status}</Badge>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-semibold">Product Title</label>
                <Input name="name" defaultValue={product.name} required />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold">Subtitle</label>
                <Input name="subtitle" defaultValue={product.subtitle ?? ''} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold">MRP (₹ INR)</label>
                <Input
                  name="mrp_rupees"
                  type="number"
                  step="1"
                  defaultValue={product.mrp_paise / 100}
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold">Selling Price (₹ INR)</label>
                <Input
                  name="sale_price_rupees"
                  type="number"
                  step="1"
                  defaultValue={product.sale_price_paise / 100}
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold">Visibility Status</label>
                <Select name="status" defaultValue={product.status}>
                  <option value="published">Published</option>
                  <option value="draft">Draft</option>
                  <option value="archived">Archived</option>
                </Select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold">SEO Title</label>
                <Input name="seo_title" defaultValue={product.seo_title ?? ''} />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold">Short Description</label>
              <Textarea name="short_description" defaultValue={product.short_description} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold">Full Description</label>
              <Textarea name="description" defaultValue={product.description} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold">SEO Meta Description</label>
              <Textarea
                name="seo_description"
                defaultValue={product.seo_description ?? ''}
                className="min-h-[70px]"
              />
            </div>

            <Button type="submit" variant="primary">
              Save Product Changes
            </Button>
          </form>

          {/* Variants Matrix */}
          <div className="rounded-[20px] border border-[#E6E3DC] bg-white p-6 shadow-soft">
            <h3 className="font-heading text-base font-bold text-[#11151B]">
              Size Variants &amp; Pricing
            </h3>
            <div className="mt-4 space-y-3">
              {(product.variants ?? []).map(
                (v: {
                  id: string;
                  sku: string;
                  size_code: string;
                  size_label: string;
                  mrp_paise: number;
                  sale_price_paise: number;
                  is_active: boolean;
                }) => (
                  <form
                    key={v.id}
                    action={async (fd) => {
                      'use server';
                      await updateVariantPriceAction(fd);
                    }}
                    className="grid items-end gap-3 rounded-[14px] border border-[#E6E3DC] bg-[#FAFAF8] p-4 sm:grid-cols-12"
                  >
                    <input type="hidden" name="variant_id" value={v.id} />
                    <div className="sm:col-span-4">
                      <p className="text-sm font-semibold text-[#11151B]">{v.size_label}</p>
                      <p className="text-xs text-[#5C636E]">SKU: {v.sku}</p>
                    </div>
                    <div className="sm:col-span-2">
                      <label className="mb-1 block text-[11px] font-semibold">MRP (₹)</label>
                      <Input
                        name="mrp_rupees"
                        type="number"
                        defaultValue={v.mrp_paise / 100}
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="mb-1 block text-[11px] font-semibold">Price (₹)</label>
                      <Input
                        name="sale_price_rupees"
                        type="number"
                        defaultValue={v.sale_price_paise / 100}
                      />
                    </div>
                    <div className="flex items-center gap-2 sm:col-span-2">
                      <input
                        type="checkbox"
                        name="is_active"
                        defaultChecked={v.is_active}
                        className="h-4 w-4 accent-[#0E1116]"
                      />
                      <span className="text-xs font-medium">Active</span>
                    </div>
                    <div className="sm:col-span-2">
                      <Button type="submit" variant="secondary" size="sm" className="w-full">
                        Update
                      </Button>
                    </div>
                  </form>
                )
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

import { requireAdmin } from '@/lib/auth/admin';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import {
  updateStoreSettingsAction,
  assignAdminRoleAction,
} from '@/actions/admin/mutations';
import { Button } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatISTDateTime } from '@/lib/utils/format';

export default async function AdminSettingsPage() {
  const actor = await requireAdmin(['super_admin', 'admin']);
  const admin = createAdminSupabaseClient();

  const [{ data: settings }, { data: adminUsers }, { data: logs }] = await Promise.all([
    admin.from('store_settings').select('*').eq('setting_key', 'default').maybeSingle(),
    admin.from('admin_users').select('*, profile:profiles(email, full_name)'),
    admin.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(20),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-heading text-xl font-bold text-[#11151B]">
          Store Settings, GST &amp; Access Control
        </h2>
        <p className="text-xs text-[#5C636E]">
          Manage brand identity, GST details, COD rules, WhatsApp care contact, and role-based
          admin permissions. Sensitive Stripe keys are never displayed in plaintext.
        </p>
      </div>

      {/* Store Settings Form */}
      {settings && (
        <form
          action={async (fd) => {
            'use server';
            await updateStoreSettingsAction(fd);
          }}
          className="space-y-5 rounded-[20px] border border-[#E6E3DC] bg-white p-6 shadow-soft"
        >
          <h3 className="font-heading text-base font-bold text-[#11151B]">
            Business, GST &amp; Storefront Configuration
          </h3>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold">Brand Name</label>
              <Input name="brand_name" defaultValue={settings.brand_name} required />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold">Tagline</label>
              <Input name="tagline" defaultValue={settings.tagline} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold">Legal Business Name</label>
              <Input name="business_legal_name" defaultValue={settings.business_legal_name} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold">GSTIN</label>
              <Input name="gstin" defaultValue={settings.gstin ?? ''} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold">Support Email</label>
              <Input name="support_email" defaultValue={settings.support_email} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold">Support Phone</label>
              <Input name="support_phone" defaultValue={settings.support_phone} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold">WhatsApp Number (91XXXXXXXXXX)</label>
              <Input name="whatsapp_number" defaultValue={settings.whatsapp_number ?? ''} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold">Business Address</label>
              <Input name="business_address" defaultValue={settings.business_address} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold">Free Shipping Threshold (₹)</label>
              <Input
                name="free_shipping_rupees"
                type="number"
                defaultValue={settings.free_shipping_threshold_paise / 100}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold">Default Shipping Charge (₹)</label>
              <Input
                name="default_shipping_rupees"
                type="number"
                defaultValue={settings.default_shipping_charge_paise / 100}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold">Return Window (Days)</label>
              <Input
                name="return_window_days"
                type="number"
                defaultValue={settings.return_window_days}
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-6 pt-2 text-sm">
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                name="cod_enabled"
                defaultChecked={settings.cod_enabled}
                className="h-4 w-4 accent-[#0E1116]"
              />
              Enable Cash on Delivery (COD)
            </label>
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                name="gst_inclusive_pricing"
                defaultChecked={settings.gst_inclusive_pricing}
                className="h-4 w-4 accent-[#0E1116]"
              />
              GST-Inclusive Catalog Pricing
            </label>
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                name="store_live"
                defaultChecked={settings.store_live}
                className="h-4 w-4 accent-[#0E1116]"
              />
              Store Live
            </label>
          </div>

          <Button type="submit" variant="primary">
            Save Store Settings
          </Button>
        </form>
      )}

      {/* Admin Users & RBAC (Super Admin Only Write) */}
      <div className="rounded-[20px] border border-[#E6E3DC] bg-white p-6 shadow-soft space-y-4">
        <h3 className="font-heading text-base font-bold text-[#11151B]">
          Admin Roles &amp; Team Access
        </h3>
        {actor.role === 'super_admin' && (
          <form
            action={async (fd) => {
              'use server';
              await assignAdminRoleAction(fd);
            }}
            className="flex flex-wrap items-end gap-3"
          >
            <div className="flex-1 min-w-[220px]">
              <label className="mb-1 block text-xs font-semibold">Registered User Email</label>
              <Input name="email" type="email" required placeholder="manager@kamora.in" />
            </div>
            <div className="w-48">
              <label className="mb-1 block text-xs font-semibold">Role</label>
              <Select name="role" defaultValue="order_manager">
                <option value="super_admin">Super Admin</option>
                <option value="admin">Admin</option>
                <option value="order_manager">Order Manager</option>
                <option value="inventory_manager">Inventory Manager</option>
                <option value="content_manager">Content Manager</option>
              </Select>
            </div>
            <Button type="submit" variant="secondary">
              Assign Role
            </Button>
          </form>
        )}

        <div className="divide-y divide-[#E6E3DC] text-sm">
          {(adminUsers ?? []).map((au) => {
            const p = Array.isArray(au.profile) ? au.profile[0] : au.profile;
            return (
              <div key={au.id} className="flex items-center justify-between py-2.5">
                <div>
                  <p className="font-medium text-[#11151B]">
                    {p?.full_name ?? p?.email ?? au.user_id}
                  </p>
                  <p className="text-xs text-[#5C636E]">{p?.email}</p>
                </div>
                <Badge variant="default">{String(au.role).replaceAll('_', ' ')}</Badge>
              </div>
            );
          })}
        </div>
      </div>

      {/* Audit Logs */}
      <div className="rounded-[20px] border border-[#E6E3DC] bg-white p-6 shadow-soft">
        <h3 className="font-heading text-base font-bold text-[#11151B]">Recent Audit Trail</h3>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-[#E6E3DC] text-[#5C636E] uppercase">
              <tr>
                <th className="py-2 pr-4">Timestamp (IST)</th>
                <th className="py-2 pr-4">Action</th>
                <th className="py-2 pr-4">Entity</th>
                <th className="py-2">Role</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E6E3DC]/80">
              {(logs ?? []).map((log) => (
                <tr key={log.id}>
                  <td className="py-2 pr-4 text-[#5C636E]">{formatISTDateTime(log.created_at)}</td>
                  <td className="py-2 pr-4 font-semibold text-[#11151B]">{log.action}</td>
                  <td className="py-2 pr-4 text-[#5C636E]">{log.entity_type}</td>
                  <td className="py-2">{log.actor_role ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

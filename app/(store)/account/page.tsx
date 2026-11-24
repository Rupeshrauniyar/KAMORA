import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Package, MapPin, User, ShieldCheck } from 'lucide-react';
import { createServerSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/server';
import { isAuthorizedAdminEmail } from '@/lib/auth/admin-allowlist';
import { formatISTDateTime, formatPaise } from '@/lib/utils/format';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AccountActions } from '@/components/forms/account-actions';

export const dynamic = 'force-dynamic';

export default async function AccountPage() {
  if (!isSupabaseConfigured()) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <Badge variant="default">Customer Account</Badge>
        <h1 className="mt-3 font-heading text-3xl font-bold text-[#11151B]">
          Sign In to Manage Your Orders
        </h1>
        <p className="mt-2 text-sm text-[#5C636E]">
          Connect your Supabase project credentials in <code>.env.local</code> to enable customer
          authentication, saved addresses, and order history.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link href="/login">
            <Button variant="primary">Go to Sign In</Button>
          </Link>
          <Link href="/track-order">
            <Button variant="secondary">Track Guest Order</Button>
          </Link>
        </div>
      </div>
    );
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?next=/account');
  }

  const [{ data: profile }, { data: addresses }, { data: orders }, { data: adminRow }] =
    await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
      supabase
        .from('user_addresses')
        .select('*')
        .eq('user_id', user.id)
        .order('is_default', { ascending: false }),
      supabase
        .from('orders')
        .select('id, order_number, total_paise, order_status, payment_status, created_at, items:order_items(product_name, variant_label, quantity)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('admin_users')
        .select('role')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle(),
    ]);

  const showAdminDashboard =
    Boolean(adminRow) || isAuthorizedAdminEmail(user.email, user.email_confirmed_at);

  return (
    <div className="bg-[#FAFAF8] py-12">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <Badge variant="default">Customer Portal</Badge>
            <h1 className="mt-2 font-heading text-3xl font-bold text-[#11151B]">
              Hello, {profile?.full_name ?? user.email ?? 'Kamora Member'}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            {showAdminDashboard && (
              <Link href="/admin" prefetch={false}>
                <Button variant="primary" size="sm">
                  <ShieldCheck className="h-4 w-4" />
                  Admin Dashboard
                </Button>
              </Link>
            )}
            <AccountActions />
          </div>
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-12">
          {/* Profile & Saved Addresses */}
          <div className="space-y-6 lg:col-span-4">
            <section className="rounded-[20px] border border-[#E6E3DC] bg-white p-6 shadow-soft">
              <h2 className="flex items-center gap-2 font-heading text-base font-bold text-[#11151B]">
                <User className="h-4 w-4 text-[#1C3D5A]" />
                Profile Details
              </h2>
              <dl className="mt-4 space-y-2.5 text-sm">
                <div>
                  <dt className="text-xs text-[#5C636E]">Name</dt>
                  <dd className="font-medium text-[#11151B]">{profile?.full_name ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-xs text-[#5C636E]">Email</dt>
                  <dd className="font-medium text-[#11151B]">{profile?.email ?? user.email ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-xs text-[#5C636E]">Mobile</dt>
                  <dd className="font-medium text-[#11151B]">{profile?.phone ?? user.phone ?? '—'}</dd>
                </div>
              </dl>
            </section>

            <section className="rounded-[20px] border border-[#E6E3DC] bg-white p-6 shadow-soft">
              <h2 className="flex items-center gap-2 font-heading text-base font-bold text-[#11151B]">
                <MapPin className="h-4 w-4 text-[#1C3D5A]" />
                Saved Addresses ({addresses?.length ?? 0})
              </h2>
              {addresses && addresses.length > 0 ? (
                <div className="mt-4 space-y-3 text-xs text-[#5C636E]">
                  {addresses.map((addr) => (
                    <div
                      key={addr.id}
                      className="rounded-[12px] border border-[#E6E3DC] bg-[#FAFAF8] p-3.5"
                    >
                      <p className="font-semibold text-[#11151B]">
                        {addr.label} · {addr.full_name}
                      </p>
                      <p className="mt-1">
                        {addr.address_line1}
                        {addr.address_line2 ? `, ${addr.address_line2}` : ''}, {addr.city},{' '}
                        {addr.state} – {addr.pincode}
                      </p>
                      <p className="mt-0.5">{addr.phone}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-xs text-[#5C636E]">
                  No saved addresses yet. Check &ldquo;Save address&rdquo; during checkout.
                </p>
              )}
            </section>
          </div>

          {/* Order History */}
          <div className="lg:col-span-8">
            <section className="rounded-[20px] border border-[#E6E3DC] bg-white p-6 shadow-soft">
              <div className="flex items-center justify-between">
                <h2 className="flex items-center gap-2 font-heading text-lg font-bold text-[#11151B]">
                  <Package className="h-5 w-5 text-[#1C3D5A]" />
                  Order History ({orders?.length ?? 0})
                </h2>
                <Link href="/track-order" className="text-xs font-semibold text-[#1C3D5A] hover:underline">
                  Track Any Order
                </Link>
              </div>

              {orders && orders.length > 0 ? (
                <div className="mt-5 space-y-4">
                  {orders.map((order) => (
                    <div
                      key={order.id}
                      className="rounded-[16px] border border-[#E6E3DC] bg-[#FAFAF8]/70 p-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="font-heading text-sm font-bold text-[#11151B]">
                            {order.order_number}
                          </p>
                          <p className="text-xs text-[#5C636E]">
                            {formatISTDateTime(order.created_at)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="default">
                            {order.order_status.replaceAll('_', ' ')}
                          </Badge>
                          <span className="font-heading text-sm font-bold text-[#11151B]">
                            {formatPaise(order.total_paise)}
                          </span>
                        </div>
                      </div>
                      <ul className="mt-3 space-y-1 text-xs text-[#5C636E]">
                        {(order.items ?? []).map(
                          (
                            item: { product_name: string; variant_label: string; quantity: number },
                            idx: number
                          ) => (
                            <li key={idx}>
                              {item.product_name} ({item.variant_label}) × {item.quantity}
                            </li>
                          )
                        )}
                      </ul>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-6 rounded-[16px] border border-dashed border-[#E6E3DC] p-8 text-center">
                  <p className="text-sm font-medium text-[#11151B]">
                    You haven&apos;t placed an order yet.
                  </p>
                  <Link href="/products/back-support-belt" className="mt-4 inline-block">
                    <Button variant="primary" size="sm">
                      Explore the Back Support Belt
                    </Button>
                  </Link>
                </div>
              )}
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

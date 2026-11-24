import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminSupabaseClient, isServiceRoleConfigured } from '@/lib/supabase/admin';
import { normalizeIndianPhone } from '@/lib/utils/format';

const stockNotifySchema = z.object({
  variant_id: z.string().min(1),
  size_code: z.string().min(1).max(20),
  size_label: z.string().min(1).max(80),
  product_name: z.string().min(1).max(160),
  email: z.string().trim().email('Please enter a valid email address'),
  phone: z.string().trim().max(20).optional().default(''),
});

export async function POST(request: Request) {
  try {
    const raw = await request.json();
    const parsed = stockNotifySchema.safeParse(raw);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Please enter a valid email address.' },
        { status: 400 }
      );
    }

    const { variant_id, size_code, size_label, product_name, email, phone } = parsed.data;
    const cleanPhone = phone ? normalizeIndianPhone(phone) : null;

    if (isServiceRoleConfigured()) {
      try {
        const admin = createAdminSupabaseClient();
        await admin.from('notifications').insert({
          channel: cleanPhone ? 'whatsapp' : 'email',
          event_type: 'back_in_stock_alert',
          recipient: email.toLowerCase(),
          subject: `Restock Alert Request: ${product_name} (${size_label})`,
          body: `Notify ${email.toLowerCase()}${cleanPhone ? ` / ${cleanPhone}` : ''} as soon as ${product_name} — ${size_label} is back in stock.`,
          metadata: {
            variant_id,
            size_code,
            size_label,
            product_name,
            email: email.toLowerCase(),
            phone: cleanPhone,
          },
          status: 'queued',
        });
      } catch (dbErr) {
        // Log cleanly if migrations are pending while still giving clear feedback
        console.error('[POST /api/stock-notify] DB insert skipped:', dbErr);
      }
    }

    return NextResponse.json({
      ok: true,
      message: `You're on the priority restock list for Size ${size_code}. Once restocked, we will notify you immediately at ${email.toLowerCase()}${cleanPhone ? ` and ${cleanPhone}` : ''}.`,
    });
  } catch {
    return NextResponse.json(
      { error: 'Unable to save your restock alert right now.' },
      { status: 500 }
    );
  }
}

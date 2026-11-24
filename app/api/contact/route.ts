import { NextResponse } from 'next/server';
import { contactFormSchema } from '@/lib/validation/schemas';
import { createAdminSupabaseClient, isServiceRoleConfigured } from '@/lib/supabase/admin';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = contactFormSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Please check your message details.' },
        { status: 400 }
      );
    }

    if (!isServiceRoleConfigured()) {
      return NextResponse.json(
        {
          error:
            'Contact form persistence requires Supabase credentials. You can also reach Kamora Care directly via email or WhatsApp.',
        },
        { status: 503 }
      );
    }

    const admin = createAdminSupabaseClient();
    await admin.from('notifications').insert({
      channel: 'email',
      event_type: 'customer_contact_inquiry',
      recipient: parsed.data.email.toLowerCase(),
      subject: `Contact Inquiry from ${parsed.data.name}${parsed.data.order_number ? ` (${parsed.data.order_number})` : ''}`,
      body: parsed.data.message,
      metadata: {
        name: parsed.data.name,
        phone: parsed.data.phone,
        order_number: parsed.data.order_number,
      },
      status: 'queued',
    });

    return NextResponse.json({
      message: 'Thank you for reaching out! Our Kamora Care team will respond within 1 business day.',
    });
  } catch {
    return NextResponse.json({ error: 'Unable to send your message right now.' }, { status: 500 });
  }
}

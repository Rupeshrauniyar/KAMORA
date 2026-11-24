import { NextResponse } from 'next/server';
import { getShippingZones, getStoreSettings } from '@/lib/data/storefront';
import { matchShippingZone } from '@/lib/pricing/engine';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const pincode = (searchParams.get('pincode') ?? '').trim();

  if (!/^[1-9][0-9]{5}$/.test(pincode)) {
    return NextResponse.json(
      { error: 'Please enter a valid 6-digit Indian PIN code.' },
      { status: 400 }
    );
  }

  const [zones, settings] = await Promise.all([getShippingZones(), getStoreSettings()]);
  const matched = matchShippingZone(pincode, zones);

  if (!matched || !matched.is_serviceable) {
    return NextResponse.json({
      serviceable: false,
      message: 'This PIN code is currently not serviceable via standard delivery.',
    });
  }

  return NextResponse.json({
    serviceable: true,
    zone_name: matched.name,
    estimated_min_days: matched.estimated_min_days,
    estimated_max_days: matched.estimated_max_days,
    shipping_charge_paise: matched.shipping_charge_paise,
    free_shipping_threshold_paise: matched.free_shipping_threshold_paise,
    cod_available: matched.cod_available && settings.cod_enabled,
    cod_fee_paise: matched.cod_fee_paise,
  });
}

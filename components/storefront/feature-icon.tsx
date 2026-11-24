import {
  SlidersHorizontal,
  ShieldCheck,
  Wind,
  Move,
  Sparkles,
  Sun,
  HeartHandshake,
  Layers,
  CheckCircle2,
} from 'lucide-react';

export function FeatureIcon({
  name,
  className = 'h-5 w-5',
}: {
  name: string;
  className?: string;
}) {
  switch (name) {
    case 'sliders-horizontal':
      return <SlidersHorizontal className={className} />;
    case 'shield-check':
      return <ShieldCheck className={className} />;
    case 'wind':
      return <Wind className={className} />;
    case 'move':
      return <Move className={className} />;
    case 'sparkles':
      return <Sparkles className={className} />;
    case 'sun':
      return <Sun className={className} />;
    case 'heart-handshake':
      return <HeartHandshake className={className} />;
    case 'layers':
      return <Layers className={className} />;
    default:
      return <CheckCircle2 className={className} />;
  }
}

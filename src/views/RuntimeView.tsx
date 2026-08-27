import { EnvelopeExperience } from '../components/EnvelopeExperience';
import type { GiftConfig } from '../models/giftConfig';

interface RuntimeViewProps {
  gift: GiftConfig;
  backgroundImageUrl?: string;
}

export function RuntimeView({ gift, backgroundImageUrl }: RuntimeViewProps) {
  return <EnvelopeExperience gift={gift} backgroundImageUrl={backgroundImageUrl} />;
}

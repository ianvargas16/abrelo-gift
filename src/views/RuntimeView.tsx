import { EnvelopeExperience } from '../components/EnvelopeExperience';
import type { GiftConfig } from '../models/giftConfig';

interface RuntimeViewProps {
  gift: GiftConfig;
}

export function RuntimeView({ gift }: RuntimeViewProps) {
  return <EnvelopeExperience gift={gift} />;
}

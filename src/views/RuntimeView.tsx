import { EnvelopeExperience } from '../components/EnvelopeExperience';
import type { GiftConfig } from '../models/giftConfig';

interface RuntimeViewProps {
  gift: GiftConfig;
  backgroundImageUrl?: string;
  memoryImageUrls?: Record<string, string>;
}

export function RuntimeView({ gift, backgroundImageUrl, memoryImageUrls }: RuntimeViewProps) {
  return <EnvelopeExperience gift={gift} backgroundImageUrl={backgroundImageUrl} memoryImageUrls={memoryImageUrls} />;
}

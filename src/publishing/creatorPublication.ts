import { createGiftFile, type GiftConfig } from '../models/giftConfig';
import type { PublishedGift } from './publishGift';

export interface CreatorPublication {
  gift: PublishedGift;
  snapshot: string;
}

export function createCreatorPublication(
  gift: PublishedGift,
  config: GiftConfig,
): CreatorPublication {
  return {
    gift,
    snapshot: JSON.stringify(createGiftFile(config)),
  };
}

export function hasUnpublishedChanges(
  publication: CreatorPublication | null,
  config: GiftConfig,
): boolean {
  return publication !== null
    && publication.snapshot !== JSON.stringify(createGiftFile(config));
}

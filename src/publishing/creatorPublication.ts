import { createGiftFile, parseGiftFile, type GiftConfig } from '../models/giftConfig';
import type { PublishedGift } from './publishGift';

export interface CreatorPublication {
  gift: PublishedGift;
  snapshot: string;
  shareMessage?: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function parseCreatorPublication(value: unknown): CreatorPublication {
  if (!isRecord(value) || !isRecord(value.gift)) {
    throw new Error('Publicación local inválida');
  }

  const { gift, snapshot } = value;
  if (typeof gift.id !== 'string' || gift.id.trim().length === 0 || typeof gift.url !== 'string' || typeof snapshot !== 'string') {
    throw new Error('Publicación local inválida');
  }

  if (value.shareMessage !== undefined && typeof value.shareMessage !== 'string') {
    throw new Error('Publicación local inválida');
  }

  try {
    const url = new URL(gift.url);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') {
      throw new Error('URL inválida');
    }

    parseGiftFile(JSON.parse(snapshot));
  } catch {
    throw new Error('Publicación local inválida');
  }

  return {
    gift: { id: gift.id, url: gift.url },
    snapshot,
    ...(value.shareMessage === undefined ? {} : { shareMessage: value.shareMessage }),
  };
}

export function createCreatorPublication(
  gift: PublishedGift,
  config: GiftConfig,
  shareMessage?: string,
): CreatorPublication {
  return {
    gift,
    snapshot: JSON.stringify(createGiftFile(config)),
    ...(shareMessage === undefined ? {} : { shareMessage }),
  };
}

export function hasUnpublishedChanges(
  publication: CreatorPublication | null,
  config: GiftConfig,
): boolean {
  return publication !== null
    && publication.snapshot !== JSON.stringify(createGiftFile(config));
}

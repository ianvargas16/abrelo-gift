import { createGiftFile, parseCreatorGiftConfig } from '../models/giftConfig';
import type { GiftConfig } from '../models/giftConfig';

export const LEGACY_GIFT_DRAFT_STORAGE_KEY = 'abrelo.gift.v1';

export function readLegacyGiftDraft(storage: Storage): GiftConfig | null {
  try {
    const saved = storage.getItem(LEGACY_GIFT_DRAFT_STORAGE_KEY);
    return saved ? parseCreatorGiftConfig(JSON.parse(saved)) : null;
  } catch {
    return null;
  }
}

export function loadGiftDraft(fallback: GiftConfig): GiftConfig {
  return readLegacyGiftDraft(window.localStorage) ?? fallback;
}

export function saveGiftDraft(gift: GiftConfig): void {
  window.localStorage.setItem(LEGACY_GIFT_DRAFT_STORAGE_KEY, JSON.stringify(createGiftFile(gift)));
}

import { createGiftFile, parseGiftFile } from '../models/giftConfig';
import type { GiftConfig } from '../models/giftConfig';

const STORAGE_KEY = 'abrelo.gift.v1';

export function loadGiftDraft(fallback: GiftConfig): GiftConfig {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    return saved ? parseGiftFile(JSON.parse(saved)) : fallback;
  } catch {
    return fallback;
  }
}

export function saveGiftDraft(gift: GiftConfig): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(createGiftFile(gift)));
}

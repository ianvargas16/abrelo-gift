import { parseGiftFile, type GiftConfig } from '../models/giftConfig';

export const RUNTIME_GIFT_DATA_ID = 'abrelo-gift-data';

export type RuntimeBootstrapResult =
  | { status: 'ready'; gift: GiftConfig }
  | { status: 'error'; reason: 'missing' | 'invalid' };

interface RuntimeGiftDataSource {
  getElementById(id: string): { textContent: string | null } | null;
}

export function parseRuntimeGiftPayload(payload: string | null | undefined): RuntimeBootstrapResult {
  if (!payload?.trim()) {
    return { status: 'error', reason: 'missing' };
  }

  try {
    return {
      status: 'ready',
      gift: parseGiftFile(JSON.parse(payload)),
    };
  } catch {
    return { status: 'error', reason: 'invalid' };
  }
}

export function loadRuntimeGift(source: RuntimeGiftDataSource): RuntimeBootstrapResult {
  return parseRuntimeGiftPayload(source.getElementById(RUNTIME_GIFT_DATA_ID)?.textContent);
}

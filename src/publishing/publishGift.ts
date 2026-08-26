import { assertValidGiftPersonalization, createGiftFile, type GiftConfig } from '../models/giftConfig';

export interface PublishedGift {
  id: string;
  url: string;
}

interface PublishGiftOptions {
  apiBaseUrl?: string;
  fetcher?: typeof fetch;
  audioFile?: File | null;
}

export class PublishGiftError extends Error {
  constructor() {
    super('No pudimos publicar el regalo. Inténtalo de nuevo.');
    this.name = 'PublishGiftError';
  }
}

function getPublishEndpoint(apiBaseUrl: string): string {
  if (!apiBaseUrl) {
    return '/api/gifts';
  }

  return new URL('/api/gifts', apiBaseUrl).toString();
}

function parsePublishedGift(value: unknown): PublishedGift {
  if (typeof value !== 'object' || value === null) {
    throw new PublishGiftError();
  }

  const source = value as Record<string, unknown>;

  if (typeof source.id !== 'string' || !/^[A-Za-z0-9_-]{16,}$/u.test(source.id)) {
    throw new PublishGiftError();
  }

  if (typeof source.url !== 'string') {
    throw new PublishGiftError();
  }

  let url: URL;

  try {
    url = new URL(source.url);
  } catch {
    throw new PublishGiftError();
  }

  if (
    (url.protocol !== 'http:' && url.protocol !== 'https:')
    || !url.pathname.endsWith(`/g/${source.id}`)
  ) {
    throw new PublishGiftError();
  }

  return { id: source.id, url: url.toString() };
}

export async function publishGift(
  gift: GiftConfig,
  options: PublishGiftOptions = {},
): Promise<PublishedGift> {
  const apiBaseUrl = options.apiBaseUrl ?? import.meta.env.VITE_PUBLISH_API_URL?.trim() ?? '';
  const fetcher = options.fetcher ?? fetch;

  try {
    assertValidGiftPersonalization(gift);
    const body = options.audioFile
      ? (() => { const form = new FormData(); form.set('gift', JSON.stringify(createGiftFile(gift))); form.set('audio', options.audioFile); return form; })()
      : JSON.stringify(createGiftFile(gift));
    const response = await fetcher(getPublishEndpoint(apiBaseUrl), {
      method: 'POST',
      ...(options.audioFile ? {} : { headers: { 'Content-Type': 'application/json' } }),
      body,
    });

    if (!response.ok) {
      throw new PublishGiftError();
    }

    return parsePublishedGift(await response.json());
  } catch (error) {
    if (error instanceof PublishGiftError) {
      throw error;
    }

    throw new PublishGiftError();
  }
}

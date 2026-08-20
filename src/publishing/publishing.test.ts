import { describe, expect, it, vi } from 'vitest';
import { defaultGift } from '../config/defaultGift';
import { createGiftFile } from '../models/giftConfig';
import { PublishGiftError, publishGift } from './publishGift';
import {
  copyPublishedGiftUrl,
  createPublishedGiftQrDataUrl,
  getPublishedGiftQrPayload,
  isWebShareAvailable,
  sharePublishedGift,
} from './sharePublishedGift';

const publishedId = 'L8k4Pq2xR7mN9vY3sW1aFg';
const publishedUrl = `https://share.example/g/${publishedId}`;

describe('Creator publishing client', () => {
  it('posts the existing GiftFile contract and accepts a server-owned URL', async () => {
    const fetcher = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      expect(JSON.parse(String(init?.body))).toEqual(createGiftFile(defaultGift));
      return Response.json({ id: publishedId, url: publishedUrl }, { status: 201 });
    });

    const result = await publishGift(defaultGift, {
      apiBaseUrl: 'http://127.0.0.1:8787',
      fetcher,
    });

    expect(fetcher).toHaveBeenCalledWith('http://127.0.0.1:8787/api/gifts', expect.objectContaining({ method: 'POST' }));
    expect(result).toEqual({ id: publishedId, url: publishedUrl });
  });

  it('rejects malformed API responses with user-facing errors', async () => {
    await expect(publishGift(defaultGift, {
      fetcher: async () => Response.json({ id: '1', url: 'javascript:alert(1)' }),
    })).rejects.toBeInstanceOf(PublishGiftError);
  });
});

describe('published gift sharing', () => {
  it('copies only the published URL through the Clipboard API', async () => {
    const writeText = vi.fn(async () => undefined);

    await expect(copyPublishedGiftUrl(publishedUrl, { writeText }, undefined)).resolves.toBe(true);
    expect(writeText).toHaveBeenCalledWith(publishedUrl);
  });

  it('falls back cleanly when clipboard support is unavailable', async () => {
    await expect(copyPublishedGiftUrl(publishedUrl, undefined, undefined)).resolves.toBe(false);
  });

  it('uses generic Web Share copy and remains optional', async () => {
    const share = vi.fn(async () => undefined);

    expect(isWebShareAvailable({ share })).toBe(true);
    expect(isWebShareAvailable({})).toBe(false);
    await expect(sharePublishedGift(publishedUrl, {})).resolves.toBe(false);
    await expect(sharePublishedGift(publishedUrl, { share })).resolves.toBe(true);
    expect(share).toHaveBeenCalledWith({
      title: 'Ábrelo — Tienes un regalo',
      text: 'Te comparto un regalo para abrir y descubrir.',
      url: publishedUrl,
    });
  });

  it('encodes only the opaque public URL in the QR', async () => {
    expect(getPublishedGiftQrPayload(publishedUrl)).toBe(publishedUrl);
    await expect(createPublishedGiftQrDataUrl(publishedUrl)).resolves.toMatch(/^data:image\/png;base64,/u);
  });
});

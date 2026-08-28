import { describe, expect, it, vi } from 'vitest';
import { defaultGift } from '../config/defaultGift';
import {
  createGiftFile,
  MAX_GIFT_MESSAGE_CHARACTERS,
  MAX_GIFT_TITLE_CHARACTERS,
  parseCreatorGiftConfig,
} from '../models/giftConfig';
import {
  createCreatorPublication,
  hasUnpublishedChanges,
  parseCreatorPublication,
} from './creatorPublication';
import { PublishGiftError, publishGift } from './publishGift';
import {
  copyPublishedGiftUrl,
  createPublishedGiftQrDataUrl,
  DEFAULT_PUBLISHED_GIFT_SHARE_MESSAGE,
  getPublishedGiftShareMessage,
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

  it('publishes personalization through the unchanged GiftFile JSON contract', async () => {
    const personalizedGift = {
      ...defaultGift,
      theme: 'sage' as const,
      intro: { ...defaultGift.intro, title: 'Para una tarde distinta' },
      letter: { ...defaultGift.letter, message: 'Una primera línea.\nY otra que también importa.' },
    };
    const fetcher = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      expect(JSON.parse(String(init?.body))).toEqual(createGiftFile(personalizedGift));
      return Response.json({ id: publishedId, url: publishedUrl }, { status: 201 });
    });

    await expect(publishGift(personalizedGift, { fetcher })).resolves.toEqual({ id: publishedId, url: publishedUrl });
  });

  it('publishes optional cover and audio files without embedding either binary in GiftFile JSON', async () => {
    const audioFile = new File(['audio'], 'message.mp3', { type: 'audio/mpeg' });
    const backgroundImageFile = new File(['image'], 'background.webp', { type: 'image/webp' });
    const fetcher = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      expect(init?.body).toBeInstanceOf(FormData);
      const form = init?.body as FormData;
      expect(form.get('audio')).toBe(audioFile);
      expect(form.get('coverImage')).toBe(backgroundImageFile);
      expect(JSON.parse(String(form.get('gift')))).toEqual(createGiftFile(defaultGift));
      expect(String(form.get('gift'))).not.toContain('base64');
      return Response.json({ id: publishedId, url: publishedUrl }, { status: 201 });
    });

    await expect(publishGift(defaultGift, { fetcher, audioFile, backgroundImageFile }))
      .resolves.toEqual({ id: publishedId, url: publishedUrl });
  });

  it('publishes memory files in explicit gift order while keeping GiftFile metadata-only', async () => {
    const firstId = 'memoryAsset000000000001';
    const secondId = 'memoryAsset000000000002';
    const first = new File(['first'], 'first.jpg', { type: 'image/jpeg' });
    const second = new File(['second'], 'second.jpg', { type: 'image/jpeg' });
    const gift = {
      ...defaultGift,
      memories: {
        enabled: true,
        items: [
          { id: secondId, image: { id: secondId, mimeType: 'image/jpeg' as const, size: second.size }, order: 1 },
          { id: firstId, image: { id: firstId, mimeType: 'image/jpeg' as const, size: first.size }, order: 0 },
        ],
      },
    };
    const fetcher = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      const form = init?.body as FormData;
      expect(form.getAll('memory')).toEqual([first, second]);
      expect(String(form.get('gift'))).not.toContain('base64');
      return Response.json({ id: publishedId, url: publishedUrl }, { status: 201 });
    });

    await expect(publishGift(gift, {
      fetcher,
      memoryImageFiles: { [firstId]: first, [secondId]: second },
    })).resolves.toEqual({ id: publishedId, url: publishedUrl });
  });

  it('does not publish unresolved memory references', async () => {
    const id = 'memoryAsset000000000001';
    const gift = {
      ...defaultGift,
      memories: {
        enabled: true,
        items: [{ id, image: { id, mimeType: 'image/jpeg' as const, size: 32 }, order: 0 }],
      },
    };
    const fetcher = vi.fn();

    await expect(publishGift(gift, { fetcher })).rejects.toBeInstanceOf(PublishGiftError);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('rejects invalid personalization before making a publication request', async () => {
    const fetcher = vi.fn();
    const invalidGift = {
      ...defaultGift,
      intro: { ...defaultGift.intro, title: 'T'.repeat(81) },
    };

    await expect(publishGift(invalidGift, { fetcher })).rejects.toBeInstanceOf(PublishGiftError);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('rejects a manually modified GiftFile at import and publication boundaries', async () => {
    const fetcher = vi.fn();
    const manipulatedGift = {
      ...defaultGift,
      intro: {
        ...defaultGift.intro,
        title: 'T'.repeat(MAX_GIFT_TITLE_CHARACTERS + 1),
      },
      letter: {
        ...defaultGift.letter,
        message: 'M'.repeat(MAX_GIFT_MESSAGE_CHARACTERS + 1),
      },
    };
    const manipulatedFile = createGiftFile(manipulatedGift);

    expect(() => parseCreatorGiftConfig(manipulatedFile)).toThrow(/80 caracteres/);
    await expect(publishGift(manipulatedGift, { fetcher })).rejects.toBeInstanceOf(PublishGiftError);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('rejects malformed API responses with user-facing errors', async () => {
    await expect(publishGift(defaultGift, {
      fetcher: async () => Response.json({ id: '1', url: 'javascript:alert(1)' }),
    })).rejects.toBeInstanceOf(PublishGiftError);
  });
});

describe('Creator publication state', () => {
  it('retains the published URL and snapshot independently from the mounted panel', () => {
    const publication = createCreatorPublication({ id: publishedId, url: publishedUrl }, defaultGift);

    expect(publication.gift).toEqual({ id: publishedId, url: publishedUrl });
    expect(publication.snapshot).toBe(JSON.stringify(createGiftFile(defaultGift)));
    expect(hasUnpublishedChanges(publication, defaultGift)).toBe(false);
  });

  it('detects draft edits without mutating the earlier publication', () => {
    const publication = createCreatorPublication({ id: publishedId, url: publishedUrl }, defaultGift);
    const editedGift = { ...defaultGift, recipientName: 'Otro destinatario' };

    expect(hasUnpublishedChanges(publication, editedGift)).toBe(true);
    expect(publication.gift.url).toBe(publishedUrl);
    expect(JSON.parse(publication.snapshot).gift.recipientName).toBe(defaultGift.recipientName);
  });

  it('keeps a custom share message in Creator-only publication state', () => {
    const publication = createCreatorPublication(
      { id: publishedId, url: publishedUrl },
      defaultGift,
      'Abre esto cuando tengas un momento.',
    );

    expect(parseCreatorPublication(JSON.parse(JSON.stringify(publication)))).toEqual(publication);
    expect(JSON.stringify(createGiftFile(defaultGift))).not.toContain(publication.shareMessage!);
    expect(JSON.parse(publication.snapshot)).toEqual(createGiftFile(defaultGift));
  });

  it('keeps existing publications without a share message valid', () => {
    const legacyPublication = {
      gift: { id: publishedId, url: publishedUrl },
      snapshot: JSON.stringify(createGiftFile(defaultGift)),
    };

    expect(parseCreatorPublication(legacyPublication)).toEqual(legacyPublication);
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

  it('uses the thoughtful default or a Creator-only custom Web Share message and remains optional', async () => {
    const share = vi.fn(async () => undefined);

    expect(isWebShareAvailable({ share })).toBe(true);
    expect(isWebShareAvailable({})).toBe(false);
    expect(getPublishedGiftShareMessage()).toBe(DEFAULT_PUBLISHED_GIFT_SHARE_MESSAGE);
    expect(getPublishedGiftShareMessage('   ')).toBe(DEFAULT_PUBLISHED_GIFT_SHARE_MESSAGE);
    await expect(sharePublishedGift(publishedUrl, undefined, {})).resolves.toBe(false);
    await expect(sharePublishedGift(publishedUrl, 'Ábrelo cuando quieras.', { share })).resolves.toBe(true);
    expect(share).toHaveBeenCalledWith({
      title: 'Ábrelo — Tienes un regalo',
      text: 'Ábrelo cuando quieras.',
      url: publishedUrl,
    });
  });

  it('encodes only the opaque public URL in the QR', async () => {
    expect(getPublishedGiftQrPayload(publishedUrl)).toBe(publishedUrl);
    await expect(createPublishedGiftQrDataUrl(publishedUrl)).resolves.toMatch(/^data:image\/png;base64,/u);
  });
});

import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { defaultGift } from '../config/defaultGift';
import { createGiftFile, GIFT_FILE_SCHEMA } from '../models/giftConfig';
import { resolveTheme } from '../themes/themeRegistry';
import { RuntimeView } from '../views/RuntimeView';
import {
  getRecipientDisplayState,
  getRecipientPreparationDuration,
  RECIPIENT_PREPARATION_DURATION,
  RecipientRuntimeApp,
} from './RecipientRuntimeApp';
import { loadRuntimeGift, parseRuntimeGiftPayload, RUNTIME_GIFT_DATA_ID } from './runtimeBootstrap';

describe('recipient Runtime bootstrap', () => {
  it('accepts a valid serialized GiftFile', () => {
    const result = parseRuntimeGiftPayload(JSON.stringify(createGiftFile(defaultGift)));

    expect(result).toEqual({ status: 'ready', gift: defaultGift });
  });

  it('keeps a pre-personalization-flow GiftFile compatible with Runtime rendering', () => {
    const legacyGiftFile = {
      schema: GIFT_FILE_SCHEMA,
      version: 1,
      gift: {
        version: 1,
        recipientName: 'Sofía',
        senderName: 'Jean',
        theme: 'sage',
        intro: {
          eyebrow: 'Un detalle para hoy',
          title: 'Hay algo para ti',
          envelopeHint: 'Mantén presionado el sello',
        },
        letter: {
          title: 'Una carta para ti',
          message: 'Este mensaje ya formaba parte del regalo original.',
        },
        gift: {
          type: 'voucher',
          title: 'Una cena especial',
          description: 'Elige el lugar que prefieras.',
          finePrint: '',
          code: '',
        },
      },
    };

    const bootstrap = parseRuntimeGiftPayload(JSON.stringify(legacyGiftFile));
    expect(bootstrap).toMatchObject({
      status: 'ready',
      gift: {
        theme: 'sage',
        intro: { title: 'Hay algo para ti' },
        letter: { message: 'Este mensaje ya formaba parte del regalo original.' },
      },
    });

    if (bootstrap.status !== 'ready') throw new Error('Expected a ready Runtime gift');
    const markup = renderToStaticMarkup(<RuntimeView gift={bootstrap.gift} />);
    expect(markup).toContain('Hay algo para ti');
    expect(markup).toContain('theme-sage');
    expect(markup).toContain('data-runtime-phase="closed"');
  });

  it('accepts a published GiftFile with local memory data URLs', () => {
    const giftWithMemories = {
      ...defaultGift,
      memories: {
        enabled: true,
        items: [{
          image: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLQ9wAAAABJRU5ErkJggg==',
          caption: 'Un recuerdo guardado aquí.',
        }],
      },
    };

    expect(parseRuntimeGiftPayload(JSON.stringify(createGiftFile(giftWithMemories))))
      .toEqual({ status: 'ready', gift: giftWithMemories });
  });

  it('maps a Milestone 28 cover image to the runtime background without republishing', () => {
    const legacyGiftFile = createGiftFile({ ...defaultGift }) as unknown as {
      schema: string;
      version: number;
      gift: Record<string, unknown>;
    };
    legacyGiftFile.gift.coverImage = { mimeType: 'image/webp', size: 64_000 };

    expect(parseRuntimeGiftPayload(JSON.stringify(legacyGiftFile))).toMatchObject({
      status: 'ready',
      gift: {
        backgroundImage: { mimeType: 'image/webp', size: 64_000 },
      },
    });
  });

  it('rejects malformed JSON safely', () => {
    expect(parseRuntimeGiftPayload('{not-json')).toEqual({ status: 'error', reason: 'invalid' });
  });

  it('rejects unsupported GiftFile versions safely', () => {
    const result = parseRuntimeGiftPayload(JSON.stringify({
      schema: GIFT_FILE_SCHEMA,
      version: 99,
      gift: defaultGift,
    }));

    expect(result).toEqual({ status: 'error', reason: 'invalid' });
  });

  it('treats a missing or empty production payload as unavailable', () => {
    expect(parseRuntimeGiftPayload(null)).toEqual({ status: 'error', reason: 'missing' });
    expect(parseRuntimeGiftPayload('   ')).toEqual({ status: 'error', reason: 'missing' });
  });

  it('loads the documented embedded payload boundary', () => {
    const payload = JSON.stringify(createGiftFile(defaultGift));
    const result = loadRuntimeGift({
      getElementById(id) {
        expect(id).toBe(RUNTIME_GIFT_DATA_ID);
        return { textContent: payload };
      },
    });

    expect(result.status).toBe('ready');
  });

  it('renders an isolated preparation state before the Runtime becomes interactive', () => {
    const markup = renderToStaticMarkup(
      <RecipientRuntimeApp bootstrap={{ status: 'ready', gift: defaultGift }} />,
    );

    expect(markup).toContain('Preparando algo para ti');
    expect(markup).toContain('role="status"');
    expect(markup).not.toContain('state-sealed');
  });

  it('renders the shared Runtime after preparation without Creator controls', () => {
    const markup = renderToStaticMarkup(<RuntimeView gift={defaultGift} />);

    expect(markup).toContain('Hay algo para ti');
    expect(markup).toContain('data-runtime-phase="closed"');
    expect(markup).toContain('state-sealed');
    expect(markup).not.toContain('ticket-stage');
    expect(markup).not.toContain('gift-audio-control');
    expect(markup).not.toContain('gift-background');
    expect(markup).not.toContain('Este regalo no está disponible');
    expect(markup).not.toMatch(/Creator|editar|configuración|vista previa/i);
  });

  it('renders the canonical personalized title and selected theme in the closed Runtime state', () => {
    const gift = {
      ...defaultGift,
      theme: 'midnight' as const,
      intro: { ...defaultGift.intro, title: 'Una noche para recordar' },
    };
    const markup = renderToStaticMarkup(
      <RuntimeView gift={gift} />,
    );

    expect(markup).toContain('Una noche para recordar');
    expect(markup).toContain('theme-midnight');
    expect(markup).toContain(`--color-page:${resolveTheme('midnight').tokens.page}`);
    expect(markup).toContain(`--color-paper:${resolveTheme('midnight').tokens.paper}`);
    expect(markup).toContain('data-runtime-phase="closed"');
  });

  it('skips the preparation delay when reduced motion is preferred', () => {
    expect(getRecipientPreparationDuration(false)).toBe(RECIPIENT_PREPARATION_DURATION);
    expect(getRecipientPreparationDuration(true)).toBe(0);
  });

  it('resolves loading, ready, and error presentation states explicitly', () => {
    const ready = { status: 'ready' as const, gift: defaultGift };
    const error = { status: 'error' as const, reason: 'missing' as const };

    expect(getRecipientDisplayState(ready, true)).toBe('loading');
    expect(getRecipientDisplayState(ready, false)).toBe('ready');
    expect(getRecipientDisplayState(error, true)).toBe('error');
  });

  it('renders only recipient-safe copy when bootstrap fails', () => {
    const markup = renderToStaticMarkup(
      <RecipientRuntimeApp bootstrap={{ status: 'error', reason: 'invalid' }} />,
    );

    expect(markup).toContain('Este regalo ya no está disponible');
    expect(markup).toContain('data-recipient-state="error"');
    expect(markup).not.toContain('Preparando algo para ti');
    expect(markup).toContain('Volver a intentar');
    expect(markup).not.toMatch(/Creator|GiftConfig|JSON|schema|versión/i);
    expect(markup).not.toMatch(/vencido|eliminado|nunca existió/i);
  });
});

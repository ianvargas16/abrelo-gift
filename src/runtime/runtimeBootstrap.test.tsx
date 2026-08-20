import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { defaultGift } from '../config/defaultGift';
import { createGiftFile, GIFT_FILE_SCHEMA } from '../models/giftConfig';
import { RecipientRuntimeApp } from './RecipientRuntimeApp';
import { loadRuntimeGift, parseRuntimeGiftPayload, RUNTIME_GIFT_DATA_ID } from './runtimeBootstrap';

describe('recipient Runtime bootstrap', () => {
  it('accepts a valid serialized GiftFile', () => {
    const result = parseRuntimeGiftPayload(JSON.stringify(createGiftFile(defaultGift)));

    expect(result).toEqual({ status: 'ready', gift: defaultGift });
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

  it('renders the shared Runtime for valid bootstrap data', () => {
    const markup = renderToStaticMarkup(
      <RecipientRuntimeApp bootstrap={{ status: 'ready', gift: defaultGift }} />,
    );

    expect(markup).toContain('Hay algo para ti');
    expect(markup).not.toContain('Este regalo no está disponible');
  });

  it('renders only recipient-safe copy when bootstrap fails', () => {
    const markup = renderToStaticMarkup(
      <RecipientRuntimeApp bootstrap={{ status: 'error', reason: 'invalid' }} />,
    );

    expect(markup).toContain('Este regalo no está disponible');
    expect(markup).not.toMatch(/Creator|GiftConfig|JSON|schema|versión/i);
    expect(markup).not.toMatch(/vencido|eliminado|nunca existió/i);
    expect(markup).not.toContain('button');
  });
});

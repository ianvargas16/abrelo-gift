import { describe, expect, it, vi } from 'vitest';
import {
  createOperationalErrorEvent,
  createOperationalLogger,
  createRequestId,
} from './operationalLogging';

describe('operational logging', () => {
  it('creates privacy-conscious events with no GiftFile or request content fields', () => {
    expect(createOperationalErrorEvent('repository_read_failed', 'request-123')).toEqual({
      level: 'error',
      event: 'repository_read_failed',
      requestId: 'request-123',
    });
  });

  it('writes one structured JSON event', () => {
    const write = vi.fn();
    const logger = createOperationalLogger(write);

    logger.error('runtime_shell_failed', 'request-456');

    expect(write).toHaveBeenCalledWith(JSON.stringify({
      level: 'error',
      event: 'runtime_shell_failed',
      requestId: 'request-456',
    }));
  });

  it('generates random correlation IDs unrelated to gift data', () => {
    const first = createRequestId();
    const second = createRequestId();

    expect(first).toMatch(/^[A-Za-z0-9_-]{12}$/u);
    expect(second).toMatch(/^[A-Za-z0-9_-]{12}$/u);
    expect(first).not.toBe(second);
  });
});

export const OPERATIONAL_ERROR_CATEGORIES = [
  'repository_read_failed',
  'runtime_shell_failed',
  'runtime_injection_failed',
  'publish_persistence_failed',
  'gift_asset_cleanup_failed',
  'invalid_runtime_config',
] as const;

export type OperationalErrorCategory = (typeof OPERATIONAL_ERROR_CATEGORIES)[number];

export interface OperationalErrorEvent {
  level: 'error';
  event: OperationalErrorCategory;
  requestId: string;
}

export interface OperationalLogger {
  error(category: OperationalErrorCategory, requestId: string): void;
}

export function createRequestId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(9));
  let binary = '';

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary)
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replace(/=+$/u, '');
}

export function createOperationalErrorEvent(
  event: OperationalErrorCategory,
  requestId: string,
): OperationalErrorEvent {
  return {
    level: 'error',
    event,
    requestId,
  };
}

export function createOperationalLogger(
  write: (message: string) => void = (message) => console.error(message),
): OperationalLogger {
  return {
    error(category, requestId) {
      write(JSON.stringify(createOperationalErrorEvent(category, requestId)));
    },
  };
}

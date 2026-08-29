import QRCode from 'qrcode';

interface ClipboardWriter {
  writeText(text: string): Promise<void>;
}

interface ShareTarget {
  share?: (data: ShareData) => Promise<void>;
}

export const DEFAULT_PUBLISHED_GIFT_SHARE_MESSAGE = 'Te preparé una sorpresa para abrir cuando tengas un momento.';
export const DEFAULT_PUBLISHED_GIFT_SHARE_TITLE = 'Tienes un regalo especial · Ábrelo';
export type PublishedGiftShareResult = 'shared' | 'unavailable' | 'cancelled' | 'error';

function fallbackCopy(text: string, targetDocument: Document | undefined): boolean {
  if (!targetDocument?.body || typeof targetDocument.execCommand !== 'function') {
    return false;
  }

  const textarea = targetDocument.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  targetDocument.body.appendChild(textarea);
  textarea.select();

  try {
    return targetDocument.execCommand('copy');
  } catch {
    return false;
  } finally {
    textarea.remove();
  }
}

export async function copyPublishedGiftUrl(
  url: string,
  clipboard: ClipboardWriter | undefined = typeof navigator === 'undefined' ? undefined : navigator.clipboard,
  targetDocument: Document | undefined = typeof document === 'undefined' ? undefined : document,
): Promise<boolean> {
  if (clipboard) {
    try {
      await clipboard.writeText(url);
      return true;
    } catch {
      // Fall through for older WebViews or denied clipboard permissions.
    }
  }

  return fallbackCopy(url, targetDocument);
}

export function isWebShareAvailable(
  target: ShareTarget | undefined = typeof navigator === 'undefined' ? undefined : navigator,
): boolean {
  return typeof target?.share === 'function';
}

export function getPublishedGiftShareMessage(message?: string): string {
  return message?.trim() || DEFAULT_PUBLISHED_GIFT_SHARE_MESSAGE;
}

export function getPublishedGiftShareTitle(): string {
  return DEFAULT_PUBLISHED_GIFT_SHARE_TITLE;
}

export async function sharePublishedGift(
  url: string,
  message?: string,
  target: ShareTarget | undefined = typeof navigator === 'undefined' ? undefined : navigator,
): Promise<PublishedGiftShareResult> {
  if (!target?.share) {
    return 'unavailable';
  }

  try {
    await target.share({
      title: getPublishedGiftShareTitle(),
      text: getPublishedGiftShareMessage(message),
      url,
    });
  } catch (error) {
    return error instanceof DOMException && error.name === 'AbortError'
      ? 'cancelled'
      : 'error';
  }

  return 'shared';
}

export function getPublishedGiftQrPayload(url: string): string {
  return url;
}

export function createPublishedGiftQrDataUrl(url: string): Promise<string> {
  return QRCode.toDataURL(getPublishedGiftQrPayload(url), {
    width: 320,
    margin: 2,
    errorCorrectionLevel: 'M',
    color: {
      dark: '#241d21',
      light: '#fbf5ee',
    },
  });
}

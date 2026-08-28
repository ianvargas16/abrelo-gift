import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { defaultGift } from '../../config/defaultGift';
import { Envelope } from './Envelope';
import { Letter } from './Letter';
import { getMemoryImageUrl, MemoryStory } from './MemoryStory';
import { VoucherTicket } from './VoucherTicket';
import { WaxSeal } from './WaxSeal';

describe('Runtime empty-field presentation', () => {
  it('resolves structured memories without exposing storage keys', () => {
    const memory = {
      id: 'memoryAsset000000000001',
      image: { id: 'memoryAsset000000000001', mimeType: 'image/jpeg' as const, size: 1024 },
      order: 0,
    };

    expect(getMemoryImageUrl(memory, { [memory.id]: 'blob:creator-preview' })).toBe('blob:creator-preview');
    expect(getMemoryImageUrl({ image: 'data:image/jpeg;base64,/9j/AAAA' })).toContain('data:image/jpeg');
  });
  it('uses a neutral envelope label without duplicating Para', () => {
    const markup = renderToStaticMarkup(
      <Envelope recipientName="" state="sealed" isShaking={false} />,
    );

    expect(markup).not.toContain('Para Para ti');
    expect(markup).toContain('Para ti');
  });

  it('omits empty letter content and signature', () => {
    const markup = renderToStaticMarkup(
      <Letter title="" message="" senderName="" isRevealing={false} onReveal={vi.fn()} />,
    );

    expect(markup).toContain('<h2>Carta</h2>');
    expect(markup).not.toContain('letter-signature');
    expect(markup).not.toContain('<p>');
  });

  it('renders personalized multiline messages as escaped plain text', () => {
    const markup = renderToStaticMarkup(
      <Letter
        title="Una carta para ti"
        message={'Primera línea.\n<script>alert("no")</script>\nÚltima línea.'}
        senderName="Jean"
        isRevealing={false}
        onReveal={vi.fn()}
      />,
    );

    expect(markup).toContain('Una carta para ti');
    expect(markup).toContain('Primera línea.\n&lt;script&gt;alert(&quot;no&quot;)&lt;/script&gt;\nÚltima línea.');
    expect(markup).not.toContain('<script>');
  });

  it('omits empty optional voucher details and editor terminology', () => {
    const gift = {
      ...defaultGift,
      recipientName: '',
      senderName: '',
      gift: {
        ...defaultGift.gift,
        title: '',
        description: '',
        finePrint: '',
        code: '',
      },
    };

    const markup = renderToStaticMarkup(
      <VoucherTicket gift={gift} onRestart={vi.fn()} />,
    );

    expect(markup).toContain('Un gesto pensado para ti');
    expect(markup).not.toContain('ticket-description');
    expect(markup).not.toContain('ticket-meta');
    expect(markup).not.toContain('ticket-fineprint');
    expect(markup).not.toContain('Creator');
    expect(markup).toContain('ticket-perforation');
    expect(markup).toContain('ticket-barcode');
    expect(markup).toContain('ticket-shell');
    expect(markup).not.toContain('ticket-stub-code');
  });

  it('renders the physical ticket anatomy for configured vouchers', () => {
    const markup = renderToStaticMarkup(
      <VoucherTicket gift={defaultGift} onRestart={vi.fn()} />,
    );

    expect(markup).toContain('ticket-perforation');
    expect(markup).toContain('ticket-shell');
    expect(markup).toContain('ticket-stub-code');
    expect(markup).toContain('ticket-barcode');
    expect(markup).toContain('Volver a verlo');
  });

  it('renders a story scene only when Runtime receives configured memories', () => {
    const markup = renderToStaticMarkup(
      <MemoryStory
        memories={{
          enabled: true,
          title: 'Unos momentos',
          items: [{
            image: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLQ9wAAAABJRU5ErkJggg==',
            caption: 'Aquí empieza la historia.',
          }],
        }}
        isRevealing={false}
        onComplete={vi.fn()}
      />,
    );

    expect(markup).toContain('memory-story');
    expect(markup).toContain('memory-story-moment');
    expect(markup).toContain('Momento 01');
    expect(markup).toContain('Unos momentos');
    expect(markup).toContain('Aquí empieza la historia.');
    expect(markup).toContain('Toca para cerrar esta historia');
  });

  it('uses a neutral moment title when an older memory has no caption', () => {
    const markup = renderToStaticMarkup(
      <MemoryStory
        memories={{
          enabled: true,
          items: [{ image: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLQ9wAAAABJRU5ErkJggg==' }],
        }}
        isRevealing={false}
        onComplete={vi.fn()}
      />,
    );

    expect(markup).toContain('Un momento para recordar');
    expect(markup).toContain('Unos recuerdos para guardar');
  });

  it('starts with the first explicit memory order regardless of array position', () => {
    const markup = renderToStaticMarkup(
      <MemoryStory
        memories={{
          enabled: true,
          items: [
            {
              id: 'memoryAsset000000000002',
              image: { id: 'memoryAsset000000000002', mimeType: 'image/webp', size: 2048 },
              caption: 'Segundo momento',
              order: 1,
            },
            {
              id: 'memoryAsset000000000001',
              image: { id: 'memoryAsset000000000001', mimeType: 'image/jpeg', size: 1024 },
              caption: 'Primer momento',
              order: 0,
            },
          ],
        }}
        imageUrls={{
          memoryAsset000000000001: 'blob:first-memory',
          memoryAsset000000000002: 'blob:second-memory',
        }}
        isRevealing={false}
        onComplete={vi.fn()}
      />,
    );

    expect(markup).toContain('src="blob:first-memory"');
    expect(markup).toContain('Primer momento');
    expect(markup).not.toContain('Segundo momento');
  });

  it('does not render an empty story surface', () => {
    const markup = renderToStaticMarkup(
      <MemoryStory memories={{ enabled: true, items: [] }} isRevealing={false} onComplete={vi.fn()} />,
    );

    expect(markup).toBe('');
  });

  it('uses optional alt text, caption, then a neutral fallback for memory images', () => {
    const image = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLQ9wAAAABJRU5ErkJggg==';
    const renderMemory = (item: { image: string; caption?: string; alt?: string }) => renderToStaticMarkup(
      <MemoryStory memories={{ enabled: true, items: [item] }} isRevealing={false} onComplete={vi.fn()} />,
    );

    expect(renderMemory({ image, caption: 'Una mesa junto a la ventana.', alt: 'Dos copas sobre una mesa.' })).toContain('alt="Dos copas sobre una mesa."');
    expect(renderMemory({ image, caption: 'Una mesa junto a la ventana.' })).toContain('alt="Una mesa junto a la ventana."');
    expect(renderMemory({ image })).toContain('alt="Recuerdo personal"');
  });
});

describe('Runtime seal presentation', () => {
  it('exposes a clear pressed state while preserving the hold interaction', () => {
    const markup = renderToStaticMarkup(
      <WaxSeal
        progress={0.48}
        status="holding"
        onStart={() => true}
        onRelease={() => undefined}
        onCancel={() => undefined}
        onInterrupt={() => undefined}
      />,
    );

    expect(markup).toContain('is-holding');
    expect(markup).toContain('aria-pressed="true"');
    expect(markup).toContain('--hold-progress:0.48');
  });
});

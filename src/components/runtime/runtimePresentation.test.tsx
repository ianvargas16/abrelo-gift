import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { defaultGift } from '../../config/defaultGift';
import { Envelope } from './Envelope';
import { Letter } from './Letter';
import { Memories } from './Memories';
import { VoucherTicket } from './VoucherTicket';

describe('Runtime empty-field presentation', () => {
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

  it('renders a keepsake scene only when Runtime receives configured memories', () => {
    const markup = renderToStaticMarkup(
      <Memories
        memories={{
          enabled: true,
          title: 'Unos momentos',
          items: [{
            image: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLQ9wAAAABJRU5ErkJggg==',
            caption: 'Aquí empieza la historia.',
          }],
        }}
        isRevealing={false}
        onReveal={vi.fn()}
      />,
    );

    expect(markup).toContain('memory-keepsake');
    expect(markup).toContain('Aquí empieza la historia.');
    expect(markup).toContain('Descubrir mi regalo');
  });

  it('uses optional alt text, caption, then a neutral fallback for memory images', () => {
    const image = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLQ9wAAAABJRU5ErkJggg==';
    const renderMemory = (item: { image: string; caption?: string; alt?: string }) => renderToStaticMarkup(
      <Memories memories={{ enabled: true, items: [item] }} isRevealing={false} onReveal={vi.fn()} />,
    );

    expect(renderMemory({ image, caption: 'Una mesa junto a la ventana.', alt: 'Dos copas sobre una mesa.' })).toContain('alt="Dos copas sobre una mesa."');
    expect(renderMemory({ image, caption: 'Una mesa junto a la ventana.' })).toContain('alt="Una mesa junto a la ventana."');
    expect(renderMemory({ image })).toContain('alt="Recuerdo personal"');
  });
});

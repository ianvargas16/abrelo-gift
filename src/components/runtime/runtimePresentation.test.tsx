import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { defaultGift } from '../../config/defaultGift';
import { Envelope } from './Envelope';
import { Letter } from './Letter';
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
  });
});

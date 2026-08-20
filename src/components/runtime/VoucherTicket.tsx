import type { GiftConfig } from '../../models/giftConfig';

interface VoucherTicketProps {
  gift: GiftConfig;
  onRestart: () => void;
}

export function VoucherTicket({ gift, onRestart }: VoucherTicketProps) {
  const recipientName = gift.recipientName.trim();
  const senderName = gift.senderName.trim();
  const ticketTitle = gift.gift.title.trim() || 'Un gesto pensado para ti';
  const ticketDescription = gift.gift.description.trim();
  const ticketFinePrint = gift.gift.finePrint.trim();
  const ticketCode = gift.gift.code.trim();

  return (
    <section className="ticket-stage" aria-live="polite">
      <div className="ticket-glow" />
      <article className="ticket">
        <div className="ticket-main">
          <p className="ticket-kicker">VALE POR</p>
          <h2>{ticketTitle}</h2>
          {ticketDescription && <p className="ticket-description">{ticketDescription}</p>}
          {recipientName && (
            <div className="ticket-meta">
              <span>PARA</span>
              <strong>{recipientName}</strong>
            </div>
          )}
          {senderName && (
            <div className="ticket-meta">
              <span>DE</span>
              <strong>{senderName}</strong>
            </div>
          )}
          {ticketFinePrint && <p className="ticket-fineprint">{ticketFinePrint}</p>}
        </div>
        <span className="ticket-perforation" aria-hidden="true" />
        <aside className="ticket-stub">
          <span className="ticket-stub-label">REGALO</span>
          {ticketCode && <strong className="ticket-stub-code">{ticketCode}</strong>}
          <div className="ticket-barcode" aria-hidden="true" />
          <span className="ticket-stub-small">ÁBRELO</span>
        </aside>
      </article>
      <button className="ghost-button" onClick={onRestart}>Volver a verlo</button>
    </section>
  );
}

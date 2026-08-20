import type { GiftConfig } from '../../models/giftConfig';

interface VoucherTicketProps {
  gift: GiftConfig;
  onRestart: () => void;
}

export function VoucherTicket({ gift, onRestart }: VoucherTicketProps) {
  return (
    <section className="ticket-stage" aria-live="polite">
      <div className="ticket-glow" />
      <article className="ticket">
        <div className="ticket-main">
          <p className="ticket-kicker">VALE POR</p>
          <h2>{gift.gift.title}</h2>
          <p className="ticket-description">{gift.gift.description}</p>
          <div className="ticket-meta">
            <span>PARA</span>
            <strong>{gift.recipientName}</strong>
          </div>
          <div className="ticket-meta">
            <span>DE</span>
            <strong>{gift.senderName}</strong>
          </div>
          <p className="ticket-fineprint">{gift.gift.finePrint}</p>
        </div>
        <aside className="ticket-stub">
          <span className="ticket-stub-label">REGALO</span>
          <strong>{gift.gift.code}</strong>
          <div className="ticket-barcode" aria-hidden="true" />
          <span className="ticket-stub-small">ÁBRELO</span>
        </aside>
      </article>
      <button className="ghost-button" onClick={onRestart}>Volver a verlo</button>
    </section>
  );
}

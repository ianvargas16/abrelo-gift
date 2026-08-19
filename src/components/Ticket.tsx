import type { GiftConfig } from '../types/gift';

interface TicketProps {
  gift: GiftConfig;
  onRestart: () => void;
}

export function Ticket({ gift, onRestart }: TicketProps) {
  return (
    <section className="ticket-stage" aria-live="polite">
      <div className="ticket-glow" />
      <article className="ticket">
        <div className="ticket-main">
          <p className="ticket-kicker">VALE POR</p>
          <h2>{gift.voucherTitle}</h2>
          <p className="ticket-description">{gift.voucherDescription}</p>
          <div className="ticket-meta">
            <span>PARA</span>
            <strong>{gift.recipientName}</strong>
          </div>
          <div className="ticket-meta">
            <span>DE</span>
            <strong>{gift.senderName}</strong>
          </div>
          <p className="ticket-fineprint">{gift.voucherFinePrint}</p>
        </div>
        <aside className="ticket-stub">
          <span className="ticket-stub-label">CUMPLEAÑOS</span>
          <strong>{gift.voucherCode}</strong>
          <div className="ticket-barcode" aria-hidden="true" />
          <span className="ticket-stub-small">ADMIT ONE</span>
        </aside>
      </article>
      <button className="ghost-button" onClick={onRestart}>Volver a verlo</button>
    </section>
  );
}

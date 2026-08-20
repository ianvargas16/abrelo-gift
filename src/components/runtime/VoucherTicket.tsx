import type { GiftConfig } from '../../models/giftConfig';

interface VoucherTicketProps {
  gift: GiftConfig;
  onRestart: () => void;
}

export function VoucherTicket({ gift, onRestart }: VoucherTicketProps) {
  const recipientLabel = gift.recipientName.trim() || 'Para ti';
  const senderLabel = gift.senderName.trim() || 'Alguien que te aprecia';
  const ticketTitle = gift.gift.title.trim() || 'Un gesto pensado para ti';
  const ticketDescription = gift.gift.description.trim() || 'Aquí aparecerá la descripción del regalo una vez que el Creator la configure.';
  const ticketFinePrint = gift.gift.finePrint.trim() || 'Sin condiciones adicionales.';
  const ticketCode = gift.gift.code.trim() || 'ABRELO-001';

  return (
    <section className="ticket-stage" aria-live="polite">
      <div className="ticket-glow" />
      <article className="ticket">
        <div className="ticket-main">
          <p className="ticket-kicker">VALE POR</p>
          <h2>{ticketTitle}</h2>
          <p className="ticket-description">{ticketDescription}</p>
          <div className="ticket-meta">
            <span>PARA</span>
            <strong>{recipientLabel}</strong>
          </div>
          <div className="ticket-meta">
            <span>DE</span>
            <strong>{senderLabel}</strong>
          </div>
          <p className="ticket-fineprint">{ticketFinePrint}</p>
        </div>
        <aside className="ticket-stub">
          <span className="ticket-stub-label">REGALO</span>
          <strong>{ticketCode}</strong>
          <div className="ticket-barcode" aria-hidden="true" />
          <span className="ticket-stub-small">ÁBRELO</span>
        </aside>
      </article>
      <button className="ghost-button" onClick={onRestart}>Volver a verlo</button>
    </section>
  );
}

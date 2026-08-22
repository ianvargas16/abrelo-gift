import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from 'react';
import type { GiftConfig } from '../../models/giftConfig';
import {
  getTicketInteractionTilt,
  isEligibleTicketPointer,
  restingTicketTilt,
  type TicketInteractionTilt,
} from './ticketInteraction';

interface VoucherTicketProps {
  gift: GiftConfig;
  onRestart: () => void;
}

export function VoucherTicket({ gift, onRestart }: VoucherTicketProps) {
  const [tilt, setTilt] = useState<TicketInteractionTilt>(restingTicketTilt);
  const [isDragging, setIsDragging] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  const activePointer = useRef<{ id: number; x: number; y: number } | null>(null);
  const recipientName = gift.recipientName.trim();
  const senderName = gift.senderName.trim();
  const ticketTitle = gift.gift.title.trim() || 'Un gesto pensado para ti';
  const ticketDescription = gift.gift.description.trim();
  const ticketFinePrint = gift.gift.finePrint.trim();
  const ticketCode = gift.gift.code.trim();
  const interactionStyle = {
    '--ticket-rotate-x': `${tilt.rotateX}deg`,
    '--ticket-rotate-y': `${tilt.rotateY}deg`,
  } as CSSProperties;

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updatePreference = () => setPrefersReducedMotion(media.matches);
    updatePreference();
    media.addEventListener('change', updatePreference);
    return () => media.removeEventListener('change', updatePreference);
  }, []);

  const returnToRest = () => {
    activePointer.current = null;
    setIsDragging(false);
    setTilt(restingTicketTilt);
  };

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (prefersReducedMotion || !isEligibleTicketPointer(event)) return;

    activePointer.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
    event.currentTarget.setPointerCapture(event.pointerId);
    setIsDragging(true);
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const pointer = activePointer.current;
    if (!pointer || pointer.id !== event.pointerId) return;

    setTilt(getTicketInteractionTilt(event.clientX - pointer.x, event.clientY - pointer.y));
  };

  const handlePointerEnd = (event: PointerEvent<HTMLDivElement>) => {
    if (activePointer.current?.id !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    returnToRest();
  };

  return (
    <section className="ticket-stage" aria-live="polite">
      <div className="ticket-glow" />
      <div
        className={`ticket-interaction ${isDragging ? 'is-dragging' : ''}`}
        style={interactionStyle}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
        onLostPointerCapture={handlePointerEnd}
      >
        <div className="ticket-shell">
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
        </div>
      </div>
      <button className="ghost-button" onClick={onRestart}>Volver a verlo</button>
    </section>
  );
}

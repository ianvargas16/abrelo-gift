import type { GiftConfig } from '../../models/giftConfig';
import { Confetti } from './Confetti';
import { VoucherTicket } from './VoucherTicket';

interface GiftRevealProps {
  gift: GiftConfig;
  onRestart: () => void;
}

export function GiftReveal({ gift, onRestart }: GiftRevealProps) {
  return (
    <>
      <Confetti />
      <VoucherTicket gift={gift} onRestart={onRestart} />
    </>
  );
}

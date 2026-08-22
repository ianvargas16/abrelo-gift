import { describe, expect, it } from 'vitest';
import {
  getTicketInteractionPosition,
  isEligibleTicketPointer,
  restingTicketInteraction,
  ticketInteractionBounds,
} from './ticketInteraction';

describe('ticket interaction', () => {
  it('accepts primary touch and primary mouse input only', () => {
    expect(isEligibleTicketPointer({ pointerType: 'touch', button: 0, isPrimary: true })).toBe(true);
    expect(isEligibleTicketPointer({ pointerType: 'mouse', button: 0, isPrimary: true })).toBe(true);
    expect(isEligibleTicketPointer({ pointerType: 'mouse', button: 2, isPrimary: true })).toBe(false);
    expect(isEligibleTicketPointer({ pointerType: 'touch', button: 0, isPrimary: false })).toBe(false);
  });

  it('keeps movement and tilt within the physical interaction bounds', () => {
    expect(getTicketInteractionPosition(6, -4)).toEqual({
      x: 6,
      y: -4,
      rotation: (6 / ticketInteractionBounds.maxDragX) * ticketInteractionBounds.maxRotation,
    });
    expect(getTicketInteractionPosition(200, -200)).toEqual({
      x: ticketInteractionBounds.maxDragX,
      y: -ticketInteractionBounds.maxDragY,
      rotation: ticketInteractionBounds.maxRotation,
    });
  });

  it('returns to the resting position after an interaction', () => {
    expect(restingTicketInteraction).toEqual({ x: 0, y: 0, rotation: 0 });
  });
});

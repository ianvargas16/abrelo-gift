import { describe, expect, it } from 'vitest';
import {
  getTicketInteractionTilt,
  isEligibleTicketPointer,
  restingTicketTilt,
  ticketInteractionBounds,
} from './ticketInteraction';

describe('ticket interaction', () => {
  it('accepts primary touch and primary mouse input only', () => {
    expect(isEligibleTicketPointer({ pointerType: 'touch', button: 0, isPrimary: true })).toBe(true);
    expect(isEligibleTicketPointer({ pointerType: 'mouse', button: 0, isPrimary: true })).toBe(true);
    expect(isEligibleTicketPointer({ pointerType: 'mouse', button: 2, isPrimary: true })).toBe(false);
    expect(isEligibleTicketPointer({ pointerType: 'touch', button: 0, isPrimary: false })).toBe(false);
  });

  it('converts pointer movement into a bounded 3D tilt without a position offset', () => {
    expect(getTicketInteractionTilt(24, -20)).toEqual({
      rotateX: ticketInteractionBounds.maxTilt / 2,
      rotateY: ticketInteractionBounds.maxTilt / 2,
    });
    expect(getTicketInteractionTilt(200, -200)).toEqual({
      rotateX: ticketInteractionBounds.maxTilt,
      rotateY: ticketInteractionBounds.maxTilt,
    });
  });

  it('returns to the resting tilt after an interaction', () => {
    expect(restingTicketTilt).toEqual({ rotateX: 0, rotateY: 0 });
  });
});

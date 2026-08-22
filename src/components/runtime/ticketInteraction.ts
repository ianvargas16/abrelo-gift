export interface TicketPointerInput {
  pointerType: string;
  button: number;
  isPrimary: boolean;
}

export interface TicketInteractionTilt {
  rotateX: number;
  rotateY: number;
}

export const ticketInteractionBounds = {
  maxPointerOffsetX: 48,
  maxPointerOffsetY: 40,
  maxTilt: 6,
} as const;

function clamp(value: number, limit: number) {
  return Math.min(limit, Math.max(-limit, value));
}

export function isEligibleTicketPointer(input: TicketPointerInput) {
  return input.isPrimary && (input.pointerType !== 'mouse' || input.button === 0);
}

export function getTicketInteractionTilt(deltaX: number, deltaY: number): TicketInteractionTilt {
  const x = clamp(deltaX, ticketInteractionBounds.maxPointerOffsetX);
  const y = clamp(deltaY, ticketInteractionBounds.maxPointerOffsetY);

  return {
    rotateX: (-y / ticketInteractionBounds.maxPointerOffsetY) * ticketInteractionBounds.maxTilt,
    rotateY: (x / ticketInteractionBounds.maxPointerOffsetX) * ticketInteractionBounds.maxTilt,
  };
}

export const restingTicketTilt: TicketInteractionTilt = {
  rotateX: 0,
  rotateY: 0,
};

export interface TicketPointerInput {
  pointerType: string;
  button: number;
  isPrimary: boolean;
}

export interface TicketInteractionPosition {
  x: number;
  y: number;
  rotation: number;
}

export const ticketInteractionBounds = {
  maxDragX: 18,
  maxDragY: 14,
  maxRotation: 2.4,
} as const;

function clamp(value: number, limit: number) {
  return Math.min(limit, Math.max(-limit, value));
}

export function isEligibleTicketPointer(input: TicketPointerInput) {
  return input.isPrimary && (input.pointerType !== 'mouse' || input.button === 0);
}

export function getTicketInteractionPosition(deltaX: number, deltaY: number): TicketInteractionPosition {
  const x = clamp(deltaX, ticketInteractionBounds.maxDragX);
  const y = clamp(deltaY, ticketInteractionBounds.maxDragY);

  return {
    x,
    y,
    rotation: (x / ticketInteractionBounds.maxDragX) * ticketInteractionBounds.maxRotation,
  };
}

export const restingTicketInteraction: TicketInteractionPosition = {
  x: 0,
  y: 0,
  rotation: 0,
};

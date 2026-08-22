export const giftAtmospheres = ['soft', 'celebration', 'romantic'] as const;

export type GiftAtmosphere = typeof giftAtmospheres[number];

export function isGiftAtmosphere(value: unknown): value is GiftAtmosphere {
  return typeof value === 'string' && giftAtmospheres.includes(value as GiftAtmosphere);
}

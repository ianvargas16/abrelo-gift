export type ThemeId = 'rose' | 'midnight' | 'sage' | 'sunset';
export type GiftType = 'voucher';

export interface GiftConfig {
  recipientName: string;
  senderName: string;
  introEyebrow: string;
  introTitle: string;
  envelopeHint: string;
  letterTitle: string;
  letterMessage: string;
  giftType: GiftType;
  voucherTitle: string;
  voucherDescription: string;
  voucherFinePrint: string;
  voucherCode: string;
  theme: ThemeId;
}

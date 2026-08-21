import type { GiftConfig } from '../models/giftConfig';

export type GiftTemplateId = 'birthday' | 'anniversary' | 'dinner' | 'movie-night' | 'blank';

export interface GiftTemplate {
  id: GiftTemplateId;
  name: string;
  description: string;
  marker: string;
  createGift: () => GiftConfig;
}

function createGift(config: Omit<GiftConfig, 'version'>): GiftConfig {
  return {
    version: 1,
    ...config,
  };
}

export const giftTemplates: GiftTemplate[] = [
  {
    id: 'birthday',
    name: 'Cumpleaños',
    description: 'Un detalle para celebrar a alguien especial.',
    marker: '01',
    createGift: () => createGift({
      recipientName: '',
      senderName: '',
      theme: 'rose',
      intro: {
        eyebrow: 'HOY ES TU DIA',
        title: 'Hay algo para celebrar',
        envelopeHint: 'Mantén presionado el sello',
      },
      letter: {
        title: 'Feliz cumpleaños',
        message: 'Quería darte este detalle para que disfrutes el día a tu manera.',
      },
      gift: {
        type: 'voucher',
        title: 'Un plan elegido por ti',
        description: 'Elige el momento y yo me encargo del resto.',
        finePrint: 'Para disfrutar sin prisa',
        code: 'CELEBRA',
      },
    }),
  },
  {
    id: 'anniversary',
    name: 'Aniversario',
    description: 'Una pausa para recordar lo que comparten.',
    marker: '02',
    createGift: () => createGift({
      recipientName: '',
      senderName: '',
      theme: 'rose',
      intro: {
        eyebrow: 'PARA NOSOTROS',
        title: 'Un momento que quiero guardar',
        envelopeHint: 'Mantén presionado el sello',
      },
      letter: {
        title: 'Otro recuerdo contigo',
        message: 'Gracias por cada momento que hace que nuestra historia se sienta más nuestra.',
      },
      gift: {
        type: 'voucher',
        title: 'Una cita para dos',
        description: 'Una excusa bonita para compartir tiempo juntos.',
        finePrint: 'Canjeable cuando encontremos la noche perfecta',
        code: 'NOSOTROS',
      },
    }),
  },
  {
    id: 'dinner',
    name: 'Cena o experiencia',
    description: 'Invita a descubrir un lugar, sabor o plan.',
    marker: '03',
    createGift: () => createGift({
      recipientName: '',
      senderName: '',
      theme: 'sage',
      intro: {
        eyebrow: 'UNA INVITACION',
        title: 'Reservé algo para ti',
        envelopeHint: 'Mantén presionado el sello',
      },
      letter: {
        title: 'Hagamos espacio para esto',
        message: 'Quiero invitarte a salir de la rutina y disfrutar un plan que se sienta especial.',
      },
      gift: {
        type: 'voucher',
        title: 'Una experiencia juntos',
        description: 'Lugar, día y antojo quedan a tu elección.',
        finePrint: 'Incluye buena conversación',
        code: 'PLANES',
      },
    }),
  },
  {
    id: 'movie-night',
    name: 'Noche de película',
    description: 'Una invitación tranquila para compartir pantalla.',
    marker: '04',
    createGift: () => createGift({
      recipientName: '',
      senderName: '',
      theme: 'midnight',
      intro: {
        eyebrow: 'FUNCION ESPECIAL',
        title: 'Esta noche hay plan',
        envelopeHint: 'Mantén presionado el sello',
      },
      letter: {
        title: 'Una noche para bajar el ritmo',
        message: 'Escoge la película, prepara algo rico y deja que yo me encargue de la invitación.',
      },
      gift: {
        type: 'voucher',
        title: 'Una noche de película',
        description: 'Pantalla, comida favorita y compañía incluida.',
        finePrint: 'Canjeable cualquier noche sin planes',
        code: 'CINE',
      },
    }),
  },
  {
    id: 'blank',
    name: 'Lienzo en blanco',
    description: 'Empieza con una base serena y hazla tuya.',
    marker: '05',
    createGift: () => createGift({
      recipientName: '',
      senderName: '',
      theme: 'sunset',
      intro: {
        eyebrow: '',
        title: 'Hay algo para ti',
        envelopeHint: 'Mantén presionado el sello',
      },
      letter: {
        title: '',
        message: '',
      },
      gift: {
        type: 'voucher',
        title: '',
        description: '',
        finePrint: '',
        code: '',
      },
    }),
  },
];

export function getGiftTemplate(templateId: GiftTemplateId): GiftTemplate {
  const template = giftTemplates.find((candidate) => candidate.id === templateId);
  if (!template) {
    throw new Error('Template de regalo no encontrado');
  }

  return template;
}

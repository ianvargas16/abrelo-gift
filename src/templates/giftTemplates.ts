import type { GiftConfig, ThemeId } from '../models/giftConfig';

export type GiftTemplateId = 'birthday' | 'anniversary' | 'thank-you' | 'invitation' | 'motivation';

export interface GiftTemplate {
  id: GiftTemplateId;
  name: string;
  description: string;
  marker: string;
  theme: ThemeId;
  createGift: () => GiftConfig;
}

interface GiftTemplateDefinition extends Omit<GiftTemplate, 'theme' | 'createGift'> {
  initialGift: Omit<GiftConfig, 'version'>;
}

function cloneGift(gift: GiftConfig): GiftConfig {
  return JSON.parse(JSON.stringify(gift)) as GiftConfig;
}

function defineGiftTemplate({ initialGift, ...metadata }: GiftTemplateDefinition): GiftTemplate {
  const seed: GiftConfig = { version: 1, ...initialGift };

  return {
    ...metadata,
    theme: seed.theme,
    createGift: () => cloneGift(seed),
  };
}

export const giftTemplates: readonly GiftTemplate[] = [
  defineGiftTemplate({
    id: 'birthday',
    name: 'Cumpleaños',
    description: 'Una celebración cercana para hacer sentir especial a alguien.',
    marker: '01',
    initialGift: {
      recipientName: '',
      senderName: '',
      theme: 'sunset',
      intro: {
        eyebrow: 'HOY ES TU DIA',
        title: 'Hay algo para celebrar',
        envelopeHint: 'Mantén presionado el sello',
      },
      letter: {
        title: 'Feliz cumpleaños',
        message: 'Quería guardar estas palabras y acompañarlas con una sorpresa pensada para ti.',
      },
      gift: {
        type: 'voucher',
        title: 'Un plan elegido por ti',
        description: 'Elige el momento y yo me encargo del resto.',
        finePrint: 'Para disfrutar sin prisa',
        code: 'CELEBRA',
      },
    },
  }),
  defineGiftTemplate({
    id: 'anniversary',
    name: 'Aniversario',
    description: 'Una pausa íntima para celebrar la historia que comparten.',
    marker: '02',
    initialGift: {
      recipientName: '',
      senderName: '',
      theme: 'rose',
      intro: {
        eyebrow: 'PARA NOSOTROS',
        title: 'Un momento que quiero guardar',
        envelopeHint: 'Mantén presionado el sello',
      },
      letter: {
        title: 'Nuestra historia',
        message: 'Gracias por cada momento que hace que nuestra historia se sienta más nuestra.',
      },
      gift: {
        type: 'voucher',
        title: 'Una cita para dos',
        description: 'Una excusa bonita para compartir tiempo juntos.',
        finePrint: 'Canjeable cuando encontremos la noche perfecta',
        code: 'NOSOTROS',
      },
    },
  }),
  defineGiftTemplate({
    id: 'thank-you',
    name: 'Gracias',
    description: 'Un detalle sereno para reconocer algo que dejó huella.',
    marker: '03',
    initialGift: {
      recipientName: '',
      senderName: '',
      theme: 'sage',
      intro: {
        eyebrow: 'CON GRATITUD',
        title: 'Esto es para darte las gracias',
        envelopeHint: 'Mantén presionado el sello',
      },
      letter: {
        title: 'Gracias por estar',
        message: 'Quería detenerme un momento para agradecerte todo lo que aportas con tu forma de estar.',
      },
      gift: {
        type: 'voucher',
        title: 'Un detalle para ti',
        description: 'Una pequeña forma de devolverte un poco de todo lo bueno.',
        finePrint: 'Sin prisa y con mucho cariño',
        code: 'GRACIAS',
      },
    },
  }),
  defineGiftTemplate({
    id: 'invitation',
    name: 'Invitación',
    description: 'Una manera especial de proponer un plan y crear expectativa.',
    marker: '04',
    initialGift: {
      recipientName: '',
      senderName: '',
      theme: 'midnight',
      intro: {
        eyebrow: 'INVITACION ESPECIAL',
        title: 'Tengo un plan para ti',
        envelopeHint: 'Mantén presionado el sello',
      },
      letter: {
        title: 'Hagamos espacio para esto',
        message: 'Quiero invitarte a salir de la rutina y compartir un momento que se sienta especial.',
      },
      gift: {
        type: 'voucher',
        title: 'Una experiencia juntos',
        description: 'El lugar y el momento quedan a nuestra elección.',
        finePrint: 'Incluye buena conversación',
        code: 'PLANES',
      },
    },
  }),
  defineGiftTemplate({
    id: 'motivation',
    name: 'Ánimo',
    description: 'Palabras cálidas para acompañar, impulsar y recordar que no está solo.',
    marker: '05',
    initialGift: {
      recipientName: '',
      senderName: '',
      theme: 'sage',
      intro: {
        eyebrow: 'PARA ESTE MOMENTO',
        title: 'Un recordatorio para ti',
        envelopeHint: 'Mantén presionado el sello',
      },
      letter: {
        title: 'Sigue adelante',
        message: 'No tienes que tener todo resuelto hoy. Confío en ti y quiero acompañarte en este momento.',
      },
      gift: {
        type: 'voucher',
        title: 'Una pausa cuando la necesites',
        description: 'Tiempo, compañía y un respiro para volver a empezar.',
        finePrint: 'Disponible siempre que haga falta',
        code: 'CONTIGO',
      },
    },
  }),
];

export function getGiftTemplate(templateId: GiftTemplateId): GiftTemplate {
  const template = giftTemplates.find((candidate) => candidate.id === templateId);
  if (!template) throw new Error('Template de regalo no encontrado');
  return template;
}

export function applyGiftTemplate(currentGift: GiftConfig, template: GiftTemplate): GiftConfig {
  const nextGift = template.createGift();

  return {
    ...nextGift,
    recipientName: currentGift.recipientName,
    senderName: currentGift.senderName,
    ...(currentGift.audio ? { audio: { ...currentGift.audio } } : {}),
    ...(currentGift.backgroundImage ? { backgroundImage: { ...currentGift.backgroundImage } } : {}),
    ...(currentGift.memories ? { memories: cloneGift(currentGift).memories } : {}),
  };
}

export function templateWouldChangeGift(currentGift: GiftConfig, template: GiftTemplate): boolean {
  return JSON.stringify(applyGiftTemplate(currentGift, template)) !== JSON.stringify(currentGift);
}

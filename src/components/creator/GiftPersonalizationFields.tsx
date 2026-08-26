import { useEffect, useState } from 'react';
import {
  MAX_GIFT_MESSAGE_CHARACTERS,
  MAX_GIFT_TITLE_CHARACTERS,
  validateGiftPersonalization,
  type GiftConfig,
  type ThemeId,
} from '../../models/giftConfig';
import { ThemeMoodPicker } from './ThemeMoodPicker';

interface GiftPersonalizationFieldsProps {
  gift: GiftConfig;
  onTitleChange: (title: string) => void;
  onMessageChange: (message: string) => void;
  onThemeChange: (theme: ThemeId) => void;
  onValidityChange: (hasErrors: boolean) => void;
}

export function GiftPersonalizationFields({
  gift,
  onTitleChange,
  onMessageChange,
  onThemeChange,
  onValidityChange,
}: GiftPersonalizationFieldsProps) {
  const [titleDraft, setTitleDraft] = useState(gift.intro.title);
  const [messageDraft, setMessageDraft] = useState(gift.letter.message);
  const validation = validateGiftPersonalization({
    intro: { ...gift.intro, title: titleDraft },
    letter: { ...gift.letter, message: messageDraft },
  });
  const titleError = validation.title;
  const messageError = validation.message;

  useEffect(() => setTitleDraft(gift.intro.title), [gift.intro.title]);
  useEffect(() => setMessageDraft(gift.letter.message), [gift.letter.message]);
  useEffect(
    () => onValidityChange(Boolean(titleError || messageError)),
    [messageError, onValidityChange, titleError],
  );

  const changeTitle = (title: string) => {
    setTitleDraft(title);
    const errors = validateGiftPersonalization({
      intro: { ...gift.intro, title },
      letter: { ...gift.letter, message: messageDraft },
    });
    if (!errors.title) onTitleChange(title);
  };

  const changeMessage = (message: string) => {
    setMessageDraft(message);
    const errors = validateGiftPersonalization({
      intro: { ...gift.intro, title: titleDraft },
      letter: { ...gift.letter, message },
    });
    if (!errors.message) onMessageChange(message);
  };

  return (
    <div className="gift-personalization-fields">
      <label className={`field ${titleError ? 'is-invalid' : ''}`}>
        <span>Título principal</span>
        <input
          value={titleDraft}
          placeholder="Un regalo para ti"
          aria-invalid={Boolean(titleError)}
          aria-describedby="gift-title-meta"
          onChange={(event) => changeTitle(event.target.value)}
        />
        <small id="gift-title-meta" className={`field-meta ${titleError ? 'is-error' : ''}`}>
          <span>{titleError || 'Será lo primero que vea al abrir el enlace.'}</span>
          <span>{titleDraft.length}/{MAX_GIFT_TITLE_CHARACTERS}</span>
        </small>
      </label>

      <label className={`field ${messageError ? 'is-invalid' : ''}`}>
        <span>Mensaje para quien lo recibe</span>
        <textarea
          rows={6}
          value={messageDraft}
          placeholder="Escribe unas palabras que quieras conservar tal como las sentiste."
          aria-invalid={Boolean(messageError)}
          aria-describedby="gift-message-meta"
          onChange={(event) => changeMessage(event.target.value)}
        />
        <small id="gift-message-meta" className={`field-meta ${messageError ? 'is-error' : ''}`}>
          <span>{messageError || 'Se respetarán los saltos de línea.'}</span>
          <span>{messageDraft.length}/{MAX_GIFT_MESSAGE_CHARACTERS}</span>
        </small>
      </label>

      <div className="gift-personalization-theme">
        <div>
          <span className="field-label">Atmósfera visual</span>
          <p>Elige el papel, el tono y los acentos que acompañarán toda la experiencia.</p>
        </div>
        <ThemeMoodPicker value={gift.theme} onChange={onThemeChange} />
      </div>
    </div>
  );
}

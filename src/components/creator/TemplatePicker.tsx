import { createPortal } from 'react-dom';
import type { GiftTemplate } from '../../templates/giftTemplates';

interface TemplatePickerProps {
  templates: GiftTemplate[];
  onChoose: (template: GiftTemplate) => void;
  onClose: () => void;
}

export function TemplatePicker({ templates, onChoose, onClose }: TemplatePickerProps) {
  return createPortal(
    <div
      className="template-dialog-backdrop"
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <section
        className="template-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="template-dialog-title"
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            onClose();
          }
        }}
      >
        <div className="template-dialog-heading">
          <div>
            <p className="section-kicker">Nuevo regalo</p>
            <h2 id="template-dialog-title">Elige una intención</h2>
            <p>Parte de una idea y personaliza cada detalle después.</p>
          </div>
          <button type="button" className="icon-button" aria-label="Cerrar templates" onClick={onClose}>×</button>
        </div>

        <div className="template-list">
          {templates.map((template) => (
            <button
              key={template.id}
              type="button"
              className={`template-option template-option-${template.id}`}
              onClick={() => onChoose(template)}
            >
              <span className="template-marker" aria-hidden="true">{template.marker}</span>
              <span className="template-option-copy">
                <strong>{template.name}</strong>
                <small>{template.description}</small>
              </span>
              <span className="template-option-arrow" aria-hidden="true">→</span>
            </button>
          ))}
        </div>
      </section>
    </div>,
    document.body,
  );
}

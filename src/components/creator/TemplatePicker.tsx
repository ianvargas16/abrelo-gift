import type { GiftTemplate } from '../../templates/giftTemplates';
import { CreatorDialog } from './CreatorDialog';

interface TemplatePickerProps {
  templates: GiftTemplate[];
  onChoose: (template: GiftTemplate) => void;
  onClose: () => void;
}

const templateMood: Record<GiftTemplate['id'], string> = {
  birthday: 'Celebración cercana',
  anniversary: 'Historia compartida',
  dinner: 'Una invitación para salir',
  'movie-night': 'Un plan para bajar el ritmo',
  blank: 'Todo empieza contigo',
};

export function TemplatePicker({ templates, onChoose, onClose }: TemplatePickerProps) {
  return (
    <CreatorDialog
      backdropClassName="template-dialog-backdrop"
      dialogClassName="template-dialog"
      labelledBy="template-dialog-title"
      closeLabel="Cerrar selector de regalos"
      onClose={onClose}
      heading={(
        <>
          <p className="section-kicker">Nuevo regalo</p>
          <h2 id="template-dialog-title">Elige una intención</h2>
          <p>Parte de una idea y personaliza cada detalle después.</p>
        </>
      )}
    >
      <div className="template-list">
        {templates.map((template) => (
          <button
            key={template.id}
            type="button"
            className={`template-option template-option-${template.id}`}
            onClick={() => onChoose(template)}
          >
            <span className="template-option-visual" aria-hidden="true">
              <span className="template-marker">{template.marker}</span>
            </span>
            <span className="template-option-copy">
              <strong>{template.name}</strong>
              <small>{template.description}</small>
              <em>{templateMood[template.id]}</em>
            </span>
            <span className="template-option-arrow" aria-hidden="true">→</span>
          </button>
        ))}
      </div>
    </CreatorDialog>
  );
}

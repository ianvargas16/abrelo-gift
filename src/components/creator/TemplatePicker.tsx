import type { CSSProperties } from 'react';
import type { GiftTemplate } from '../../templates/giftTemplates';
import { resolveTheme } from '../../themes/themeRegistry';
import { CreatorDialog } from './CreatorDialog';

interface TemplatePickerProps {
  templates: readonly GiftTemplate[];
  confirmationTemplate?: GiftTemplate | null;
  mode?: 'create' | 'apply';
  onChoose: (template: GiftTemplate) => void;
  onConfirm?: () => void;
  onCancelConfirmation?: () => void;
  onClose: () => void;
}

interface TemplateOptionListProps {
  templates: readonly GiftTemplate[];
  onChoose: (template: GiftTemplate) => void;
}

interface TemplateApplyConfirmationProps {
  template: GiftTemplate;
  onConfirm?: () => void;
  onCancel?: () => void;
}

export function TemplateOptionList({ templates, onChoose }: TemplateOptionListProps) {
  return (
    <div className="template-list">
      {templates.map((template) => {
        const theme = resolveTheme(template.theme);
        const style = {
          '--template-accent': theme.tokens.accent,
          '--template-paper': theme.tokens.paper,
        } as CSSProperties;

        return (
          <button
            key={template.id}
            type="button"
            className="template-option"
            style={style}
            onClick={() => onChoose(template)}
          >
            <span className="template-option-visual" aria-hidden="true">
              <span className="template-marker">{template.marker}</span>
            </span>
            <span className="template-option-copy">
              <strong>{template.name}</strong>
              <small>{template.description}</small>
              <em><i style={{ background: theme.tokens.accent }} /> {theme.name}</em>
            </span>
            <span className="template-option-arrow" aria-hidden="true">→</span>
          </button>
        );
      })}
    </div>
  );
}

export function TemplateApplyConfirmation({ template, onConfirm, onCancel }: TemplateApplyConfirmationProps) {
  return (
    <div className="template-confirmation" role="alert">
      <span className="field-label">Confirmar cambio</span>
      <h3>¿Aplicar {template.name}?</h3>
      <p>Aplicar esta plantilla reemplazará la personalización actual. El fondo, el audio y tus recuerdos se conservarán.</p>
      <div className="template-confirmation-actions">
        <button type="button" className="ghost-button" onClick={onCancel}>Volver</button>
        <button type="button" className="primary-button" onClick={onConfirm}>Aplicar plantilla</button>
      </div>
    </div>
  );
}

export function TemplatePicker({
  templates,
  confirmationTemplate = null,
  mode = 'create',
  onChoose,
  onConfirm,
  onCancelConfirmation,
  onClose,
}: TemplatePickerProps) {
  return (
    <CreatorDialog
      backdropClassName="template-dialog-backdrop"
      dialogClassName="template-dialog"
      labelledBy="template-dialog-title"
      closeLabel="Cerrar selector de ocasiones"
      onClose={onClose}
      heading={(
        <>
          <p className="section-kicker">{mode === 'create' ? 'Nuevo regalo' : 'Punto de partida'}</p>
          <h2 id="template-dialog-title">Elige una ocasión</h2>
          <p>Parte de una idea y personaliza cada detalle después.</p>
        </>
      )}
    >
      {confirmationTemplate ? (
        <TemplateApplyConfirmation
          template={confirmationTemplate}
          onConfirm={onConfirm}
          onCancel={onCancelConfirmation}
        />
      ) : (
        <TemplateOptionList templates={templates} onChoose={onChoose} />
      )}
    </CreatorDialog>
  );
}

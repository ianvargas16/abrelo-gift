import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { giftTemplates, getGiftTemplate } from '../../templates/giftTemplates';
import { resolveTheme } from '../../themes/themeRegistry';
import { TemplateApplyConfirmation, TemplateOptionList } from './TemplatePicker';

describe('TemplatePicker presentation', () => {
  it('shows every occasion with its description and resolved theme preview', () => {
    const markup = renderToStaticMarkup(
      <TemplateOptionList templates={giftTemplates} onChoose={vi.fn()} />,
    );

    giftTemplates.forEach((template) => {
      const theme = resolveTheme(template.theme);
      expect(markup).toContain(template.name);
      expect(markup).toContain(template.description);
      expect(markup).toContain(theme.name);
      expect(markup).toContain(theme.tokens.accent);
    });
  });

  it('explains replacement before applying a template to an existing gift', () => {
    const markup = renderToStaticMarkup(
      <TemplateApplyConfirmation
        template={getGiftTemplate('anniversary')}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    expect(markup).toContain('¿Aplicar Aniversario?');
    expect(markup).toContain('reemplazará la personalización actual');
    expect(markup).toContain('El fondo, el audio y tus recuerdos se conservarán');
    expect(markup).toContain('Aplicar plantilla');
  });
});

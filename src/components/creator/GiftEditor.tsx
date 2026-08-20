import type { GiftConfig, ThemeId } from '../../models/giftConfig';

interface GiftEditorProps {
  gift: GiftConfig;
  onChange: (gift: GiftConfig) => void;
  onPreview: () => void;
  onReset: () => void;
  onExport: () => void;
  onImport: (file: File) => void;
}

const themes: Array<{ id: ThemeId; label: string }> = [
  { id: 'rose', label: 'Rosa vino' },
  { id: 'midnight', label: 'Medianoche' },
  { id: 'sage', label: 'Salvia' },
  { id: 'sunset', label: 'Atardecer' },
];

export function GiftEditor({ gift, onChange, onPreview, onReset, onExport, onImport }: GiftEditorProps) {
  const setRoot = <K extends keyof GiftConfig>(key: K, value: GiftConfig[K]) => onChange({ ...gift, [key]: value });
  const setIntro = <K extends keyof GiftConfig['intro']>(key: K, value: GiftConfig['intro'][K]) => onChange({ ...gift, intro: { ...gift.intro, [key]: value } });
  const setLetter = <K extends keyof GiftConfig['letter']>(key: K, value: GiftConfig['letter'][K]) => onChange({ ...gift, letter: { ...gift.letter, [key]: value } });
  const setVoucher = <K extends keyof GiftConfig['gift']>(key: K, value: GiftConfig['gift'][K]) => onChange({ ...gift, gift: { ...gift.gift, [key]: value } });
  const recipientLabel = gift.recipientName.trim() || 'Para ti';
  const senderLabel = gift.senderName.trim() || 'Alguien que te quiere';
  const introTitle = gift.intro.title.trim() || 'Hay algo para ti';
  const giftTitle = gift.gift.title.trim() || 'Vale por una sorpresa';
  const letterExcerpt = gift.letter.message.trim() || 'Aquí aparecerá la carta que acompaña el momento del reveal.';

  return (
    <main className="studio-shell">
      <div className="studio-atmosphere studio-atmosphere-one" aria-hidden="true" />
      <div className="studio-atmosphere studio-atmosphere-two" aria-hidden="true" />

      <section className="studio-frame">
        <header className="studio-header">
          <div className="studio-brand">
            <p className="eyebrow">ÁBRELO · CREATOR</p>
            <h1>Diseña un regalo que se abre como un objeto.</h1>
            <p>
              Configura el archivo portable del regalo, ajusta su tono visual y
              prueba el Runtime sin filtrar herramientas de edición al
              destinatario.
            </p>
          </div>

          <div className="studio-header-actions">
            <span className="studio-status">GiftConfig portable · Runtime aislado</span>
            <button className="primary-button" onClick={onPreview}>Abrir preview completo</button>
          </div>
        </header>

        <section className="studio-layout">
          <div className="studio-panel studio-editor-panel">
            <div className="studio-panel-head">
              <div>
                <p className="section-kicker">Editor</p>
                <h2>Studio</h2>
              </div>
              <p>Una mesa de trabajo sobria para escribir el regalo, no un dashboard.</p>
            </div>

            <div className="studio-form">
              <section className="studio-section">
                <div className="studio-section-heading">
                  <span>01</span>
                  <div>
                    <h3>Llegada</h3>
                    <p>El texto inicial antes de tocar el sobre.</p>
                  </div>
                </div>

                <label className="field">
                  <span>Fecha / detalle superior</span>
                  <input value={gift.intro.eyebrow} onChange={(event) => setIntro('eyebrow', event.target.value)} />
                </label>
                <label className="field">
                  <span>Título de bienvenida</span>
                  <input value={gift.intro.title} onChange={(event) => setIntro('title', event.target.value)} />
                </label>
                <label className="field">
                  <span>Indicación del sello</span>
                  <input value={gift.intro.envelopeHint} onChange={(event) => setIntro('envelopeHint', event.target.value)} />
                </label>
              </section>

              <section className="studio-section">
                <div className="studio-section-heading">
                  <span>02</span>
                  <div>
                    <h3>Personas</h3>
                    <p>Quién recibe el regalo y quién lo entrega.</p>
                  </div>
                </div>

                <div className="field-grid">
                  <label className="field">
                    <span>Destinatario</span>
                    <input value={gift.recipientName} onChange={(event) => setRoot('recipientName', event.target.value)} />
                  </label>
                  <label className="field">
                    <span>Remitente</span>
                    <input value={gift.senderName} onChange={(event) => setRoot('senderName', event.target.value)} />
                  </label>
                </div>
              </section>

              <section className="studio-section">
                <div className="studio-section-heading">
                  <span>03</span>
                  <div>
                    <h3>Carta</h3>
                    <p>El momento editorial antes del reveal.</p>
                  </div>
                </div>

                <div className="field-grid">
                  <label className="field">
                    <span>Título de la carta</span>
                    <input value={gift.letter.title} onChange={(event) => setLetter('title', event.target.value)} />
                  </label>
                  <label className="field">
                    <span>Tipo de regalo</span>
                    <input value="Vale por" disabled />
                  </label>
                </div>

                <label className="field">
                  <span>Mensaje</span>
                  <textarea rows={6} value={gift.letter.message} onChange={(event) => setLetter('message', event.target.value)} />
                </label>
              </section>

              <section className="studio-section">
                <div className="studio-section-heading">
                  <span>04</span>
                  <div>
                    <h3>Vale por…</h3>
                    <p>La pieza final: más ticket impreso que formulario.</p>
                  </div>
                </div>

                <div className="field-grid">
                  <label className="field">
                    <span>Regalo</span>
                    <input value={gift.gift.title} onChange={(event) => setVoucher('title', event.target.value)} />
                  </label>
                  <label className="field">
                    <span>Código del ticket</span>
                    <input value={gift.gift.code} onChange={(event) => setVoucher('code', event.target.value)} />
                  </label>
                </div>

                <label className="field">
                  <span>Descripción</span>
                  <textarea rows={4} value={gift.gift.description} onChange={(event) => setVoucher('description', event.target.value)} />
                </label>

                <label className="field">
                  <span>Condiciones / detalle</span>
                  <input value={gift.gift.finePrint} onChange={(event) => setVoucher('finePrint', event.target.value)} />
                </label>
              </section>

              <section className="studio-section">
                <div className="studio-section-heading">
                  <span>05</span>
                  <div>
                    <h3>Apariencia</h3>
                    <p>Una misma familia visual con personalidades distintas.</p>
                  </div>
                </div>

                <div className="theme-picker">
                  {themes.map((theme) => (
                    <button
                      key={theme.id}
                      type="button"
                      className={`theme-choice theme-swatch-${theme.id} ${gift.theme === theme.id ? 'selected' : ''}`}
                      onClick={() => setRoot('theme', theme.id)}
                    >
                      <i />
                      <span>{theme.label}</span>
                      <small>{theme.id}</small>
                    </button>
                  ))}
                </div>
              </section>
            </div>
          </div>

          <aside className="studio-panel studio-preview-panel">
            <div className="studio-panel-head">
              <div>
                <p className="section-kicker">Visual preview</p>
                <h2>Presencia</h2>
              </div>
              <p>Una referencia decorativa dentro del Creator. El Runtime completo vive en la ruta de preview.</p>
            </div>

            <div className={`studio-preview-card theme-${gift.theme}`}>
              <div className="studio-preview-meta">
                <span className="preview-meta-label">Vista del regalo</span>
                <button className="ghost-button studio-inline-preview-button" onClick={onPreview}>Abrir preview</button>
              </div>

              <div className="studio-preview-object" aria-hidden="true">
                <div className="studio-preview-shadow" />
                <div className="studio-preview-envelope">
                  <div className="studio-preview-envelope-back" />
                  <div className="studio-preview-letter">
                    <small>Para</small>
                    <strong>{recipientLabel}</strong>
                  </div>
                  <div className="studio-preview-envelope-front">
                    <small>Ábrelo</small>
                  </div>
                  <div className="studio-preview-envelope-flap" />
                  <div className="studio-preview-seal">✦</div>
                </div>
              </div>

              <div className="studio-preview-copy">
                <p className="section-kicker">{gift.intro.eyebrow.trim() || 'ÁBRELO · GIFT'}</p>
                <h3>{introTitle}</h3>
                <p>{letterExcerpt}</p>
              </div>

              <div className="studio-preview-ticket">
                <div>
                  <span className="ticket-inline-label">Vale por</span>
                  <strong>{giftTitle}</strong>
                </div>
                <div>
                  <span className="ticket-inline-label">De</span>
                  <strong>{senderLabel}</strong>
                </div>
              </div>
            </div>
          </aside>
        </section>

        <footer className="studio-footer">
          <div className="studio-secondary-actions">
            <button className="ghost-button" onClick={onReset}>Restaurar demo</button>
            <label className="ghost-button file-button">
              Importar regalo
              <input
                type="file"
                accept=".json,.gift.json,application/json"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) {
                    onImport(file);
                  }
                  event.currentTarget.value = '';
                }}
              />
            </label>
            <button className="ghost-button" onClick={onExport}>Exportar .gift.json</button>
          </div>

          <button className="primary-button studio-primary-action" onClick={onPreview}>Previsualizar Runtime</button>
        </footer>
      </section>
    </main>
  );
}

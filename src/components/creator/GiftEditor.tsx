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

  return (
    <main className="editor-shell">
      <section className="editor-header">
        <div>
          <p className="eyebrow">ÁBRELO · CREATOR</p>
          <h1>Crea un regalo que se descubre.</h1>
          <p>Configura el archivo portable del regalo y prueba el Runtime sin exponer controles de edición al destinatario.</p>
        </div>
        <button className="primary-button" onClick={onPreview}>Previsualizar Runtime →</button>
      </section>

      <section className="editor-grid">
        <div className="editor-card">
          <div className="editor-section-title"><span>01</span><div><h2>Llegada</h2><p>El texto inicial antes de tocar el sobre.</p></div></div>
          <label>Fecha / detalle superior<input value={gift.intro.eyebrow} onChange={(event) => setIntro('eyebrow', event.target.value)} /></label>
          <label>Título de bienvenida<input value={gift.intro.title} onChange={(event) => setIntro('title', event.target.value)} /></label>
          <label>Indicación del sello<input value={gift.intro.envelopeHint} onChange={(event) => setIntro('envelopeHint', event.target.value)} /></label>
        </div>

        <div className="editor-card">
          <div className="editor-section-title"><span>02</span><div><h2>Personas</h2><p>Quién recibe el regalo y quién lo entrega.</p></div></div>
          <label>Destinatario<input value={gift.recipientName} onChange={(event) => setRoot('recipientName', event.target.value)} /></label>
          <label>Remitente<input value={gift.senderName} onChange={(event) => setRoot('senderName', event.target.value)} /></label>
        </div>

        <div className="editor-card editor-card-wide">
          <div className="editor-section-title"><span>03</span><div><h2>Carta</h2><p>El momento íntimo antes del reveal.</p></div></div>
          <div className="two-columns">
            <label>Título de la carta<input value={gift.letter.title} onChange={(event) => setLetter('title', event.target.value)} /></label>
            <label>Tipo de regalo<input value="Vale por" disabled /></label>
          </div>
          <label>Mensaje<textarea rows={5} value={gift.letter.message} onChange={(event) => setLetter('message', event.target.value)} /></label>
        </div>

        <div className="editor-card editor-card-wide">
          <div className="editor-section-title"><span>04</span><div><h2>Vale por…</h2><p>La sorpresa final del primer tipo de regalo.</p></div></div>
          <div className="two-columns">
            <label>Regalo<input value={gift.gift.title} onChange={(event) => setVoucher('title', event.target.value)} /></label>
            <label>Código del ticket<input value={gift.gift.code} onChange={(event) => setVoucher('code', event.target.value)} /></label>
          </div>
          <label>Descripción<textarea rows={3} value={gift.gift.description} onChange={(event) => setVoucher('description', event.target.value)} /></label>
          <label>Condiciones / detalle<input value={gift.gift.finePrint} onChange={(event) => setVoucher('finePrint', event.target.value)} /></label>
        </div>

        <div className="editor-card editor-card-wide">
          <div className="editor-section-title"><span>05</span><div><h2>Estilo</h2><p>La misma experiencia con distintas personalidades visuales.</p></div></div>
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
              </button>
            ))}
          </div>
        </div>
      </section>

      <footer className="editor-footer">
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
        <button className="primary-button" onClick={onPreview}>Abrir Preview</button>
      </footer>
    </main>
  );
}

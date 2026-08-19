import type { GiftConfig, ThemeId } from '../types/gift';

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
  const set = <K extends keyof GiftConfig>(key: K, value: GiftConfig[K]) => onChange({ ...gift, [key]: value });

  return (
    <main className="editor-shell">
      <section className="editor-header">
        <div>
          <p className="eyebrow">ÁBRELO · CREATOR</p>
          <h1>Crea un regalo que se descubre.</h1>
          <p>Configura la experiencia. El destinatario solo verá el sobre y la sorpresa final.</p>
        </div>
        <button className="primary-button" onClick={onPreview}>Vista del regalo →</button>
      </section>

      <section className="editor-grid">
        <div className="editor-card">
          <div className="editor-section-title"><span>01</span><div><h2>Personas</h2><p>Quién lo recibe y quién lo entrega.</p></div></div>
          <label>Nombre del cumpleañero<input value={gift.recipientName} onChange={(e) => set('recipientName', e.target.value)} /></label>
          <label>De parte de<input value={gift.senderName} onChange={(e) => set('senderName', e.target.value)} /></label>
        </div>

        <div className="editor-card">
          <div className="editor-section-title"><span>02</span><div><h2>La carta</h2><p>El momento antes de revelar el regalo.</p></div></div>
          <label>Título<input value={gift.letterTitle} onChange={(e) => set('letterTitle', e.target.value)} /></label>
          <label>Mensaje<textarea rows={5} value={gift.letterMessage} onChange={(e) => set('letterMessage', e.target.value)} /></label>
        </div>

        <div className="editor-card editor-card-wide">
          <div className="editor-section-title"><span>03</span><div><h2>Vale por…</h2><p>La sorpresa que aparecerá al final.</p></div></div>
          <div className="two-columns">
            <label>Regalo<input value={gift.voucherTitle} onChange={(e) => set('voucherTitle', e.target.value)} /></label>
            <label>Código del ticket<input value={gift.voucherCode} onChange={(e) => set('voucherCode', e.target.value)} /></label>
          </div>
          <label>Descripción<textarea rows={3} value={gift.voucherDescription} onChange={(e) => set('voucherDescription', e.target.value)} /></label>
          <label>Condiciones / detalle<input value={gift.voucherFinePrint} onChange={(e) => set('voucherFinePrint', e.target.value)} /></label>
        </div>

        <div className="editor-card editor-card-wide">
          <div className="editor-section-title"><span>04</span><div><h2>Estilo</h2><p>Una personalidad distinta sin tocar código.</p></div></div>
          <div className="theme-picker">
            {themes.map((theme) => (
              <button key={theme.id} className={`theme-choice theme-swatch-${theme.id} ${gift.theme === theme.id ? 'selected' : ''}`} onClick={() => set('theme', theme.id)}>
                <i /><span>{theme.label}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      <footer className="editor-footer">
        <button className="ghost-button" onClick={onReset}>Restaurar demo</button>
        <label className="ghost-button file-button">
          Importar regalo
          <input type="file" accept=".json,.gift.json,application/json" onChange={(e) => { const file = e.target.files?.[0]; if (file) onImport(file); e.currentTarget.value = ''; }} />
        </label>
        <button className="ghost-button" onClick={onExport}>Exportar .gift.json</button>
        <button className="primary-button" onClick={onPreview}>Probar experiencia</button>
      </footer>
    </main>
  );
}

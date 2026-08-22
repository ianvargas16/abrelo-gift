import { useState, type ChangeEvent } from 'react';
import type { GiftConfig, MemorySection } from '../../models/giftConfig';
import { MAX_MEMORY_ITEMS } from '../../models/memoryMedia';
import { readMemoryImageFile } from './readMemoryImageFile';
import type { GiftProject } from '../../projects/giftProject';
import type { CreatorPublication } from '../../publishing/creatorPublication';
import type { GiftTemplate } from '../../templates/giftTemplates';
import { CreationGuide } from './CreationGuide';
import { PublishPanel } from './PublishPanel';
import { ProjectSwitcher } from './ProjectSwitcher';
import { getThemeMood, ThemeMoodPicker } from './ThemeMoodPicker';

interface GiftEditorProps {
  gift: GiftConfig;
  project: GiftProject;
  projects: GiftProject[];
  storageError: string;
  onChange: (gift: GiftConfig) => void;
  onPreview: () => void;
  onReset: () => void;
  onExport: () => void;
  onImport: (file: File) => void;
  publication: CreatorPublication | null;
  onPublicationChange: (publication: CreatorPublication) => void;
  onCreateProject: (template: GiftTemplate) => void;
  onSelectProject: (projectId: string) => void;
  onRenameProject: (projectId: string, name: string) => void;
  onDuplicateProject: (projectId: string) => void;
  onDeleteProject: (projectId: string) => void;
}

export function GiftEditor({
  gift,
  project,
  projects,
  storageError,
  onChange,
  onPreview,
  onReset,
  onExport,
  onImport,
  publication,
  onPublicationChange,
  onCreateProject,
  onSelectProject,
  onRenameProject,
  onDuplicateProject,
  onDeleteProject,
}: GiftEditorProps) {
  const [memoryError, setMemoryError] = useState('');
  const setRoot = <K extends keyof GiftConfig>(key: K, value: GiftConfig[K]) => onChange({ ...gift, [key]: value });
  const setIntro = <K extends keyof GiftConfig['intro']>(key: K, value: GiftConfig['intro'][K]) => onChange({ ...gift, intro: { ...gift.intro, [key]: value } });
  const setLetter = <K extends keyof GiftConfig['letter']>(key: K, value: GiftConfig['letter'][K]) => onChange({ ...gift, letter: { ...gift.letter, [key]: value } });
  const setVoucher = <K extends keyof GiftConfig['gift']>(key: K, value: GiftConfig['gift'][K]) => onChange({ ...gift, gift: { ...gift.gift, [key]: value } });
  const memories: MemorySection = gift.memories ?? { enabled: false, title: '', items: [] };
  const setMemories = (nextMemories: MemorySection) => onChange({ ...gift, memories: nextMemories });
  const recipientLabel = gift.recipientName.trim() || 'Para ti';
  const senderLabel = gift.senderName.trim() || 'Alguien que te quiere';
  const introTitle = gift.intro.title.trim() || 'Hay algo para ti';
  const giftTitle = gift.gift.title.trim() || 'Vale por una sorpresa';
  const letterExcerpt = gift.letter.message.trim() || 'Tu mensaje personal aparecerá aquí.';
  const hasRecipient = Boolean(gift.recipientName.trim());
  const hasMessage = Boolean(gift.letter.message.trim());
  const hasGift = Boolean(gift.gift.title.trim());
  const activeTheme = getThemeMood(gift.theme);

  const addMemoryImages = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.currentTarget.value = '';
    if (files.length === 0) return;

    const remainingSlots = MAX_MEMORY_ITEMS - memories.items.length;
    if (files.length > remainingSlots) {
      setMemoryError(`Puedes guardar hasta ${MAX_MEMORY_ITEMS} recuerdos. Elimina uno antes de añadir más.`);
      return;
    }

    try {
      const images = await Promise.all(files.map(readMemoryImageFile));
      setMemories({
        ...memories,
        enabled: true,
        items: [...memories.items, ...images.map((image) => ({ image, caption: '' }))],
      });
      setMemoryError('');
    } catch (error) {
      setMemoryError(error instanceof Error ? error.message : 'No pude añadir esa imagen.');
    }
  };

  const moveMemory = (index: number, direction: -1 | 1) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= memories.items.length) return;
    const items = [...memories.items];
    [items[index], items[nextIndex]] = [items[nextIndex], items[index]];
    setMemories({ ...memories, items });
  };

  return (
    <main className="studio-shell">
      <div className="studio-atmosphere studio-atmosphere-one" aria-hidden="true" />
      <div className="studio-atmosphere studio-atmosphere-two" aria-hidden="true" />

      <section className="studio-frame">
        <header className="studio-header">
          <div className="studio-brand">
            <p className="eyebrow">ÁBRELO · ESTUDIO</p>
            <h1>Diseña un regalo que se abre como un objeto.</h1>
            <p>
              Escribe cada detalle, elige su tono visual y recorre la experiencia
              antes de entregarla.
            </p>
          </div>

          <div className="studio-header-actions">
            <ProjectSwitcher
              activeProject={project}
              projects={projects}
              onCreate={onCreateProject}
              onSelect={onSelectProject}
              onRename={onRenameProject}
              onDuplicate={onDuplicateProject}
              onDelete={onDeleteProject}
            />
            <span className={`studio-status ${storageError ? 'is-error' : ''}`} role={storageError ? 'alert' : undefined}>
              {storageError || 'Guardado local automático'}
            </span>
            <button className="primary-button" onClick={onPreview}>Ver experiencia completa</button>
          </div>
        </header>

        <section className="studio-layout">
          <div className="studio-panel studio-editor-panel">
            <div className="studio-panel-head">
              <div>
                <p className="section-kicker">Editor</p>
                <h2>Tu estudio</h2>
              </div>
              <p>Un espacio tranquilo para escribir y dar forma al regalo.</p>
            </div>

            <CreationGuide
              hasRecipient={hasRecipient}
              hasMessage={hasMessage}
              hasGift={hasGift}
              isPublished={Boolean(publication)}
            />

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
                  <label className={`field ${!hasRecipient ? 'is-guided-empty' : ''}`}>
                    <span>Destinatario</span>
                    <input
                      value={gift.recipientName}
                      aria-describedby={!hasRecipient ? 'recipient-guidance' : undefined}
                      onChange={(event) => setRoot('recipientName', event.target.value)}
                    />
                    {!hasRecipient && <small id="recipient-guidance" className="field-guidance">Empieza por la persona que abrirá esta sorpresa.</small>}
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
                    <p>El mensaje personal antes de descubrir la sorpresa.</p>
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

                <label className={`field ${!hasMessage ? 'is-guided-empty' : ''}`}>
                  <span>Mensaje</span>
                  <textarea
                    rows={6}
                    value={gift.letter.message}
                    aria-describedby={!hasMessage ? 'message-guidance' : undefined}
                    onChange={(event) => setLetter('message', event.target.value)}
                  />
                  {!hasMessage && <small id="message-guidance" className="field-guidance">Una frase sincera basta para transformar este momento.</small>}
                </label>
              </section>

              <section className="studio-section">
                <div className="studio-section-heading">
                  <span>04</span>
                  <div>
                    <h3>Recuerdos</h3>
                    <p>Un pequeño álbum para detenerse antes de descubrir el regalo final.</p>
                  </div>
                </div>

                <div className="memory-editor-intro">
                  <div>
                    <span className="field-label">Álbum de recuerdos</span>
                    <p>Ordena los momentos como quieres que se descubran. Máximo {MAX_MEMORY_ITEMS}, de hasta 5 MB cada una.</p>
                  </div>
                  <button
                    type="button"
                    className={`memory-toggle ${memories.enabled ? 'is-active' : ''}`}
                    aria-pressed={memories.enabled}
                    onClick={() => setMemories({ ...memories, enabled: !memories.enabled })}
                  >
                    {memories.enabled ? 'Incluir recuerdos' : 'Sin recuerdos'}
                  </button>
                </div>

                {memories.enabled ? (
                  <>
                    <label className="field">
                      <span>Título del álbum</span>
                      <input
                        value={memories.title ?? ''}
                        placeholder="Unos recuerdos para guardar"
                        onChange={(event) => setMemories({ ...memories, title: event.target.value })}
                      />
                    </label>

                    {memories.items.length > 0 && (
                      <div className="memory-editor-list">
                        {memories.items.map((memory, index) => (
                          <article className="memory-editor-item" key={`${memory.image.slice(0, 48)}-${index}`}>
                            <div className="memory-editor-photo">
                              <img src={memory.image} alt="" />
                              <span>Momento {String(index + 1).padStart(2, '0')}</span>
                            </div>
                            <label className="field memory-caption-field">
                              <span>La historia de este momento</span>
                              <textarea
                                rows={3}
                                value={memory.caption ?? ''}
                                placeholder="Una frase para este momento"
                                onChange={(event) => {
                                  const items = memories.items.map((item, itemIndex) => itemIndex === index
                                    ? { ...item, caption: event.target.value }
                                    : item);
                                  setMemories({ ...memories, items });
                                }}
                              />
                            </label>
                            <details className="memory-alt-details">
                              <summary>Descripción de la imagen (opcional)</summary>
                              <label className="field">
                                <span>Texto alternativo</span>
                                <input
                                  value={memory.alt ?? ''}
                                  placeholder="Describe el recuerdo para quien no pueda verlo"
                                  onChange={(event) => {
                                    const items = memories.items.map((item, itemIndex) => itemIndex === index
                                      ? { ...item, alt: event.target.value }
                                      : item);
                                    setMemories({ ...memories, items });
                                  }}
                                />
                              </label>
                            </details>
                            <div className="memory-item-actions" aria-label={`Acciones para recuerdo ${index + 1}`}>
                              <button type="button" className="memory-order-button" onClick={() => moveMemory(index, -1)} disabled={index === 0}>Subir</button>
                              <button type="button" className="memory-order-button" onClick={() => moveMemory(index, 1)} disabled={index === memories.items.length - 1}>Bajar</button>
                              <button
                                type="button"
                                className="memory-remove-button"
                                onClick={() => setMemories({ ...memories, items: memories.items.filter((_, itemIndex) => itemIndex !== index) })}
                              >
                                Quitar
                              </button>
                            </div>
                          </article>
                        ))}
                      </div>
                    )}

                    <label className={`file-button memory-add-button ${memories.items.length >= MAX_MEMORY_ITEMS ? 'is-disabled' : ''}`}>
                      Añadir imágenes
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        multiple
                        disabled={memories.items.length >= MAX_MEMORY_ITEMS}
                        onChange={addMemoryImages}
                      />
                    </label>
                    {memoryError && <p className="memory-editor-error" role="alert">{memoryError}</p>}
                  </>
                ) : (
                  <p className="memory-editor-note">Puedes activar esta parte cuando quieras añadir un momento especial.</p>
                )}
              </section>

              <section className="studio-section">
                <div className="studio-section-heading">
                  <span>05</span>
                  <div>
                    <h3>Vale por…</h3>
                    <p>La pieza final: más ticket impreso que formulario.</p>
                  </div>
                </div>

                <div className="field-grid">
                  <label className={`field ${!hasGift ? 'is-guided-empty' : ''}`}>
                    <span>Regalo</span>
                    <input
                      value={gift.gift.title}
                      aria-describedby={!hasGift ? 'gift-guidance' : undefined}
                      onChange={(event) => setVoucher('title', event.target.value)}
                    />
                    {!hasGift && <small id="gift-guidance" className="field-guidance">Nombra el detalle que esperará al final.</small>}
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
                  <span>06</span>
                  <div>
                    <h3>Atmósfera</h3>
                    <p>Elige el ánimo, la presencia y la intensidad de la sorpresa.</p>
                  </div>
                </div>

                <p className="theme-picker-intro">Esta elección se refleja al instante en el sobre, el papel y el ticket de tu vista previa.</p>
                <ThemeMoodPicker value={gift.theme} onChange={(theme) => setRoot('theme', theme)} />
              </section>
            </div>
          </div>

          <aside className="studio-panel studio-preview-panel">
            <div className="studio-panel-head">
              <div>
                <p className="section-kicker">Vista del regalo</p>
                <h2>Presencia</h2>
              </div>
              <p>Una mirada rápida al tono, el papel y los detalles de tu regalo.</p>
            </div>

            <div className={`studio-preview-card theme-${gift.theme}`}>
              <div className="studio-preview-meta">
                <span className="preview-meta-label">{activeTheme.mood} · {activeTheme.intensity}</span>
                <button className="ghost-button studio-inline-preview-button" onClick={onPreview}>Recorrer experiencia</button>
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
                <p className="section-kicker">{gift.intro.eyebrow.trim() || 'ÁBRELO'}</p>
                <h3>{introTitle}</h3>
                <p>{letterExcerpt}</p>
              </div>

              <div className="studio-preview-mood">
                <span className="ticket-inline-label">Atmósfera</span>
                <strong>{activeTheme.label}</strong>
                <small>{activeTheme.style}</small>
              </div>

              <p className="studio-preview-hint"><span aria-hidden="true">✦</span> Presiona el sello, abre el sobre y descubre el detalle.</p>

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

        <PublishPanel
          gift={gift}
          publication={publication}
          onPublicationChange={onPublicationChange}
        />

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
        </footer>
      </section>
    </main>
  );
}

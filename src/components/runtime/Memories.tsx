import { useState } from 'react';
import type { MemorySection } from '../../models/giftConfig';

interface MemoriesProps {
  memories: MemorySection;
  isRevealing: boolean;
  onReveal: () => void;
}

export function Memories({ memories, isRevealing, onReveal }: MemoriesProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const activeMemory = memories.items[activeIndex];
  const title = memories.title?.trim() || 'Unos recuerdos para guardar';
  const caption = activeMemory.caption?.trim();
  const momentTitle = caption || 'Un instante para guardar';
  const alt = activeMemory.alt?.trim() || caption || 'Recuerdo personal';
  const hasPrevious = activeIndex > 0;
  const hasNext = activeIndex < memories.items.length - 1;

  return (
    <section className={`memories-stage ${isRevealing ? 'is-revealing' : ''}`} aria-labelledby="memories-title">
      <article className="memory-keepsake">
        <div className="memory-keepsake-header">
          <span className="memory-album-title">{title}</span>
          <span className="memory-page-count">{String(activeIndex + 1).padStart(2, '0')} / {String(memories.items.length).padStart(2, '0')}</span>
        </div>

        <div className="memory-album-page" key={`${activeMemory.image.slice(0, 48)}-${activeIndex}`} aria-live="polite">
          <div className="memory-photo-frame">
            <img src={activeMemory.image} alt={alt} />
          </div>

          <div className="memory-keepsake-copy">
            <span className="memory-moment-label">Momento {String(activeIndex + 1).padStart(2, '0')}</span>
            <h2 id="memories-title">{momentTitle}</h2>
            <p>{hasNext ? 'Sigue pasando las páginas cuando quieras.' : 'Este recuerdo guarda el camino hasta tu sorpresa.'}</p>
          </div>
        </div>

        <div className="memory-controls">
          <button type="button" className="memory-step-button" onClick={() => setActiveIndex((index) => index - 1)} disabled={!hasPrevious || isRevealing}>
            <span aria-hidden="true">←</span> Anterior
          </button>
          {hasNext ? (
            <button type="button" className="reveal-button" onClick={() => setActiveIndex((index) => index + 1)} disabled={isRevealing}>
              Siguiente momento <span aria-hidden="true">→</span>
            </button>
          ) : (
            <button type="button" className="reveal-button" onClick={onReveal} disabled={isRevealing}>
              {isRevealing ? 'Preparando tu regalo…' : 'Descubrir mi regalo'}
            </button>
          )}
        </div>
      </article>
    </section>
  );
}

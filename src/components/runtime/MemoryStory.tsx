import { useState } from 'react';
import {
  getOrderedMemories,
  isStructuredMemoryItem,
  type CompatibleMemoryItem,
  type MemorySection,
} from '../../models/giftConfig';
import { advanceMemoryStory, retreatMemoryStory, type MemoryStoryState } from './memoryStoryState';

interface MemoryStoryProps {
  memories: MemorySection;
  imageUrls?: Record<string, string>;
  isRevealing: boolean;
  onComplete: () => void;
}

export function getMemoryImageUrl(memory: CompatibleMemoryItem, imageUrls?: Record<string, string>): string {
  if (!isStructuredMemoryItem(memory)) return memory.image;
  if (imageUrls?.[memory.id]) return imageUrls[memory.id];
  const giftPath = typeof window === 'undefined' ? '' : window.location.pathname.replace(/\/$/u, '');
  return `${giftPath}/memories/${encodeURIComponent(memory.id)}`;
}

export function MemoryStory({ memories, imageUrls, isRevealing, onComplete }: MemoryStoryProps) {
  const [story, setStory] = useState<MemoryStoryState>({ activeIndex: 0, isComplete: false });
  const orderedMemories = getOrderedMemories(memories);
  if (orderedMemories.length === 0) return null;

  const activeMemory = orderedMemories[story.activeIndex];
  const title = memories.title?.trim() || 'Unos recuerdos para guardar';
  const caption = activeMemory.caption?.trim();
  const alt = activeMemory.alt?.trim() || caption || 'Recuerdo personal';
  const imageUrl = getMemoryImageUrl(activeMemory, imageUrls);
  const advance = () => setStory((current) => advanceMemoryStory(current, orderedMemories.length));
  const retreat = () => setStory((current) => retreatMemoryStory(current));

  return (
    <section
      className={`memory-story ${story.isComplete ? 'is-complete' : ''} ${isRevealing ? 'is-revealing' : ''}`}
      aria-labelledby="memory-story-title"
    >
      <article className="memory-story-sheet">
        <header className="memory-story-header">
          <div>
            <span>Recuerdos</span>
            <h2 id="memory-story-title">{title}</h2>
          </div>
          <span className="memory-story-count">
            {story.isComplete ? 'Final' : `${String(story.activeIndex + 1).padStart(2, '0')} / ${String(orderedMemories.length).padStart(2, '0')}`}
          </span>
        </header>

        {story.isComplete ? (
          <div className="memory-story-ending" aria-live="polite">
            <span aria-hidden="true">✦</span>
            <p>Estos momentos nos trajeron hasta aquí.</p>
            <strong>Ahora queda una última sorpresa.</strong>
            <button type="button" className="reveal-button" onClick={onComplete} disabled={isRevealing}>
              {isRevealing ? 'Preparando tu regalo…' : 'Descubrir mi regalo'}
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="memory-story-moment"
            key={isStructuredMemoryItem(activeMemory) ? activeMemory.id : `${activeMemory.image.slice(0, 48)}-${story.activeIndex}`}
            onClick={advance}
            disabled={isRevealing}
            aria-label={story.activeIndex < orderedMemories.length - 1 ? 'Ver el siguiente recuerdo' : 'Terminar los recuerdos'}
          >
            <span className="memory-story-photo">
              <img src={imageUrl} alt={alt} />
            </span>
            <span className={`memory-story-caption ${caption ? '' : 'is-empty'}`}>
              <small>Momento {String(story.activeIndex + 1).padStart(2, '0')}</small>
              {caption ? <strong>{caption}</strong> : <strong aria-hidden="true">Un momento para recordar</strong>}
              <em>{story.activeIndex < orderedMemories.length - 1 ? 'Toca para continuar' : 'Toca para cerrar esta historia'}</em>
            </span>
          </button>
        )}

        <footer className="memory-story-footer">
          <button type="button" className="memory-story-back" onClick={retreat} disabled={story.activeIndex === 0 && !story.isComplete}>
            <span aria-hidden="true">←</span> Volver
          </button>
          <div
            className="memory-story-progress"
            aria-label={story.isComplete ? 'Historia de recuerdos completada' : `Recuerdo ${story.activeIndex + 1} de ${orderedMemories.length}`}
          >
            {orderedMemories.map((memory, index) => (
              <span
                key={isStructuredMemoryItem(memory) ? memory.id : index}
                className={index <= story.activeIndex ? 'is-seen' : ''}
              />
            ))}
          </div>
        </footer>
      </article>
    </section>
  );
}

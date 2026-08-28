import { RuntimeView } from './RuntimeView';
import type { GiftConfig } from '../models/giftConfig';

interface PreviewViewProps {
  gift: GiftConfig;
  backgroundImagePreviewUrl?: string;
  memoryImageUrls?: Record<string, string>;
  onBackToCreator: () => void;
}

export function PreviewView({ gift, backgroundImagePreviewUrl, memoryImageUrls, onBackToCreator }: PreviewViewProps) {
  return (
    <div className="preview-shell">
      <div className="preview-chrome">
        <div className="preview-status">
          <span className="preview-badge">Vista previa</span>
          <p>Recorre el regalo antes de compartirlo.</p>
        </div>
        <button className="ghost-button preview-back-button" onClick={onBackToCreator}>← Volver a editar</button>
      </div>
      <RuntimeView gift={gift} backgroundImageUrl={backgroundImagePreviewUrl} memoryImageUrls={memoryImageUrls} />
    </div>
  );
}

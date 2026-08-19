import { RuntimeView } from './RuntimeView';
import type { GiftConfig } from '../models/giftConfig';

interface PreviewViewProps {
  gift: GiftConfig;
  onBackToCreator: () => void;
}

export function PreviewView({ gift, onBackToCreator }: PreviewViewProps) {
  return (
    <>
      <div className="preview-chrome">
        <button className="ghost-button preview-back-button" onClick={onBackToCreator}>← Volver al Creator</button>
        <span className="preview-badge">Vista previa</span>
      </div>
      <RuntimeView gift={gift} />
    </>
  );
}

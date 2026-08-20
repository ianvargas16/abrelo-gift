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
        <div className="preview-status">
          <span className="preview-badge">Creator preview</span>
          <p>Estos controles viven fuera del Runtime real.</p>
        </div>
        <button className="ghost-button preview-back-button" onClick={onBackToCreator}>← Volver al Creator</button>
      </div>
      <RuntimeView gift={gift} />
    </>
  );
}

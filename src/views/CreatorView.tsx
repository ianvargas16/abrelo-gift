import { GiftEditor } from '../components/creator/GiftEditor';
import type { GiftConfig } from '../models/giftConfig';
import type { CreatorPublication } from '../publishing/creatorPublication';

interface CreatorViewProps {
  gift: GiftConfig;
  onChange: (gift: GiftConfig) => void;
  onPreview: () => void;
  onReset: () => void;
  onExport: () => void;
  onImport: (file: File) => void;
  publication: CreatorPublication | null;
  onPublicationChange: (publication: CreatorPublication) => void;
}

export function CreatorView(props: CreatorViewProps) {
  return <GiftEditor {...props} />;
}

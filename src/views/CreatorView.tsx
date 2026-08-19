import { GiftEditor } from '../components/creator/GiftEditor';
import type { GiftConfig } from '../models/giftConfig';

interface CreatorViewProps {
  gift: GiftConfig;
  onChange: (gift: GiftConfig) => void;
  onPreview: () => void;
  onReset: () => void;
  onExport: () => void;
  onImport: (file: File) => void;
}

export function CreatorView(props: CreatorViewProps) {
  return <GiftEditor {...props} />;
}

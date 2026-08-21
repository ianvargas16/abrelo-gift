import { GiftEditor } from '../components/creator/GiftEditor';
import type { GiftConfig } from '../models/giftConfig';
import type { GiftProject } from '../projects/giftProject';
import type { CreatorPublication } from '../publishing/creatorPublication';

interface CreatorViewProps {
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
  onCreateProject: () => void;
  onSelectProject: (projectId: string) => void;
  onRenameProject: (projectId: string, name: string) => void;
  onDuplicateProject: (projectId: string) => void;
  onDeleteProject: (projectId: string) => void;
}

export function CreatorView(props: CreatorViewProps) {
  return <GiftEditor {...props} />;
}

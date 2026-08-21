import type { GiftConfig } from '../models/giftConfig';
import type { CreatorPublication } from '../publishing/creatorPublication';

export const PROJECT_STORAGE_VERSION = 1 as const;

export interface GiftProject {
  id: string;
  name: string;
  gift: GiftConfig;
  createdAt: string;
  updatedAt: string;
  publication?: CreatorPublication;
}

export interface GiftProjectStore {
  version: typeof PROJECT_STORAGE_VERSION;
  activeProjectId: string;
  projects: GiftProject[];
}

import type { GiftFile } from '../src/models/giftConfig';

export interface PublishedGiftSnapshot {
  id: string;
  giftFile: GiftFile;
  createdAt: string;
}

export interface PublishedGiftRepository {
  create(snapshot: PublishedGiftSnapshot): Promise<void>;
  getById(id: string): Promise<PublishedGiftSnapshot | null>;
}

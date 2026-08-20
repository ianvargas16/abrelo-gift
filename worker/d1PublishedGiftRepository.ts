import { createGiftFile, parseGiftFile } from '../src/models/giftConfig';
import type { PublishedGiftRepository, PublishedGiftSnapshot } from './publishedGiftRepository';

interface PublishedGiftRow {
  id: string;
  gift_json: string;
  created_at: string;
}

export class D1PublishedGiftRepository implements PublishedGiftRepository {
  constructor(private readonly database: D1Database) {}

  async create(snapshot: PublishedGiftSnapshot): Promise<void> {
    await this.database
      .prepare(`
        INSERT INTO published_gifts (id, gift_json, created_at)
        VALUES (?, ?, ?)
      `)
      .bind(snapshot.id, JSON.stringify(snapshot.giftFile), snapshot.createdAt)
      .run();
  }

  async getById(id: string): Promise<PublishedGiftSnapshot | null> {
    const row = await this.database
      .prepare(`
        SELECT id, gift_json, created_at
        FROM published_gifts
        WHERE id = ?
        LIMIT 1
      `)
      .bind(id)
      .first<PublishedGiftRow>();

    if (!row) {
      return null;
    }

    return {
      id: row.id,
      giftFile: createGiftFile(parseGiftFile(JSON.parse(row.gift_json))),
      createdAt: row.created_at,
    };
  }
}

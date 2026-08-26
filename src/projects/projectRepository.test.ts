import { describe, expect, it } from 'vitest';
import { defaultGift } from '../config/defaultGift';
import { LEGACY_GIFT_DRAFT_STORAGE_KEY } from '../lib/giftDraftStore';
import {
  createGiftFile,
  MAX_GIFT_MESSAGE_CHARACTERS,
  MAX_GIFT_TITLE_CHARACTERS,
} from '../models/giftConfig';
import { createCreatorPublication, hasUnpublishedChanges } from '../publishing/creatorPublication';
import { getGiftTemplate } from '../templates/giftTemplates';
import {
  DEFAULT_PROJECT_NAME,
  IMPORTED_PROJECT_NAME,
  PROJECT_STORAGE_KEY,
  ProjectRepository,
  ProjectStorageError,
} from './projectRepository';

class MemoryStorage implements Storage {
  private values = new Map<string, string>();
  shouldFailWrites = false;

  get length(): number {
    return this.values.size;
  }

  clear(): void {
    this.values.clear();
  }

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  key(index: number): string | null {
    return [...this.values.keys()][index] ?? null;
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }

  setItem(key: string, value: string): void {
    if (this.shouldFailWrites) {
      throw new Error('Quota exceeded');
    }
    this.values.set(key, value);
  }
}

function createRepository(storage = new MemoryStorage()) {
  let index = 0;
  let minute = 0;
  return {
    storage,
    repository: new ProjectRepository({
      storage,
      createId: () => `project-${++index}`,
      now: () => `2026-08-20T12:${String(minute++).padStart(2, '0')}:00.000Z`,
    }),
  };
}

describe('ProjectRepository', () => {
  it('creates a default first project when local storage is empty', () => {
    const { repository } = createRepository();
    const loaded = repository.load(defaultGift);

    expect(loaded.legacyMigrationPending).toBe(false);
    expect(loaded.store.projects).toHaveLength(1);
    expect(loaded.store.projects[0]).toMatchObject({
      id: 'project-1',
      name: DEFAULT_PROJECT_NAME,
      gift: defaultGift,
    });
    expect(loaded.store.activeProjectId).toBe('project-1');
  });

  it('creates, renames, saves, and switches projects without changing the first project', () => {
    const { repository } = createRepository();
    let store = repository.load(defaultGift).store;
    const firstId = store.activeProjectId;

    store = repository.create(store, defaultGift);
    const secondId = store.activeProjectId;
    store = repository.rename(store, secondId, 'Cena para Sofía');
    store = repository.saveGift(store, secondId, { ...defaultGift, recipientName: 'Lucía' });
    store = repository.select(store, firstId);

    expect(store.projects).toHaveLength(2);
    expect(repository.get(store, firstId)?.gift.recipientName).toBe('Sofía');
    expect(repository.get(store, secondId)).toMatchObject({
      name: 'Cena para Sofía',
      gift: expect.objectContaining({ recipientName: 'Lucía' }),
    });
    expect(store.activeProjectId).toBe(firstId);
  });

  it('does not update project timestamps when the saved name or GiftConfig is unchanged', () => {
    const { repository } = createRepository();
    const store = repository.load(defaultGift).store;
    const project = repository.get(store, store.activeProjectId)!;

    expect(repository.rename(store, project.id, project.name)).toBe(store);
    expect(repository.saveGift(store, project.id, project.gift)).toBe(store);
  });

  it('duplicates the GiftConfig with new metadata and no publication', () => {
    const { repository } = createRepository();
    let store = repository.load(defaultGift).store;
    const sourceId = store.activeProjectId;
    const publication = createCreatorPublication({ id: 'published-a', url: 'https://share.example/g/published-a' }, defaultGift);
    store = repository.setPublication(store, sourceId, publication);
    store = repository.duplicate(store, sourceId);

    const duplicate = repository.get(store, store.activeProjectId)!;
    expect(duplicate.id).not.toBe(sourceId);
    expect(duplicate.name).toBe(`${DEFAULT_PROJECT_NAME} copia`);
    expect(duplicate.gift).toEqual(defaultGift);
    expect(duplicate.publication).toBeUndefined();
  });

  it('persists and independently duplicates canonical personalization values', () => {
    const { repository } = createRepository();
    let store = repository.load(defaultGift).store;
    const sourceId = store.activeProjectId;
    const personalizedGift = {
      ...defaultGift,
      theme: 'sunset' as const,
      intro: { ...defaultGift.intro, title: 'Una escapada para nosotros' },
      letter: { ...defaultGift.letter, message: 'Primera parada.\nDespués, lo que queramos.' },
    };

    store = repository.saveGift(store, sourceId, personalizedGift);
    repository.save(store);
    const reloaded = repository.load(defaultGift).store;
    const duplicated = repository.duplicate(reloaded, sourceId);
    const duplicate = repository.get(duplicated, duplicated.activeProjectId)!;

    expect(repository.get(reloaded, sourceId)?.gift).toEqual(personalizedGift);
    expect(duplicate.gift).toEqual(personalizedGift);
    expect(duplicate.gift).not.toBe(repository.get(reloaded, sourceId)?.gift);
  });

  it('deletes non-active projects, selects another after deleting the active project, and recreates the final project', () => {
    const { repository } = createRepository();
    let store = repository.load(defaultGift).store;
    const firstId = store.activeProjectId;
    store = repository.create(store, defaultGift);
    const secondId = store.activeProjectId;

    store = repository.delete(store, firstId, defaultGift);
    expect(store.activeProjectId).toBe(secondId);
    expect(store.projects).toHaveLength(1);

    store = repository.delete(store, secondId, defaultGift);
    expect(store.projects).toHaveLength(1);
    expect(store.projects[0].id).not.toBe(secondId);
    expect(store.projects[0].name).toBe(DEFAULT_PROJECT_NAME);
  });

  it('migrates the valid legacy single draft once and keeps its GiftConfig intact', () => {
    const { repository, storage } = createRepository();
    const legacyGift = { ...defaultGift, recipientName: '' };
    storage.setItem(LEGACY_GIFT_DRAFT_STORAGE_KEY, JSON.stringify(createGiftFile(legacyGift)));

    const loaded = repository.load(defaultGift);
    expect(loaded.legacyMigrationPending).toBe(true);
    expect(loaded.store.projects[0].gift).toEqual(legacyGift);

    repository.save(loaded.store);
    repository.completeLegacyMigration();
    expect(storage.getItem(LEGACY_GIFT_DRAFT_STORAGE_KEY)).toBeNull();
    expect(repository.load(defaultGift).legacyMigrationPending).toBe(false);
  });

  it('recovers valid projects when another stored project is corrupted', () => {
    const { repository, storage } = createRepository();
    const validStore = repository.load(defaultGift).store;
    storage.setItem(PROJECT_STORAGE_KEY, JSON.stringify({
      ...validStore,
      projects: [...validStore.projects, { id: 'broken' }],
      activeProjectId: 'broken',
    }));

    const recovered = repository.load(defaultGift);
    expect(recovered.store.projects).toHaveLength(1);
    expect(recovered.store.activeProjectId).toBe(validStore.projects[0].id);
  });

  it('falls back to a new project when the entire stored envelope is corrupted', () => {
    const { repository, storage } = createRepository();
    storage.setItem(PROJECT_STORAGE_KEY, '{not json');

    const loaded = repository.load(defaultGift);
    expect(loaded.store.projects).toHaveLength(1);
    expect(loaded.warning).toMatch(/No pudimos recuperar/);
  });

  it('uses a valid legacy draft when a newer project envelope is corrupted', () => {
    const { repository, storage } = createRepository();
    const legacyGift = { ...defaultGift, recipientName: 'Legacy' };
    storage.setItem(PROJECT_STORAGE_KEY, '{not json');
    storage.setItem(LEGACY_GIFT_DRAFT_STORAGE_KEY, JSON.stringify(createGiftFile(legacyGift)));

    const loaded = repository.load(defaultGift);
    expect(loaded.store.projects[0].gift).toEqual(legacyGift);
    expect(loaded.legacyMigrationPending).toBe(true);
    expect(loaded.warning).toMatch(/No pudimos recuperar/);
  });

  it('keeps a valid project when only its stored publication metadata is invalid', () => {
    const { repository, storage } = createRepository();
    const validStore = repository.load(defaultGift).store;
    storage.setItem(PROJECT_STORAGE_KEY, JSON.stringify({
      ...validStore,
      projects: [{ ...validStore.projects[0], publication: { broken: true } }],
    }));

    const recovered = repository.load(defaultGift).store;
    expect(recovered.projects).toHaveLength(1);
    expect(recovered.projects[0].gift).toEqual(defaultGift);
    expect(recovered.projects[0].publication).toBeUndefined();
  });

  it('persists publication metadata per project and detects later unpublished changes', () => {
    const { repository, storage } = createRepository();
    let store = repository.load(defaultGift).store;
    const publication = createCreatorPublication({ id: 'published-a', url: 'https://share.example/g/published-a' }, defaultGift);
    store = repository.setPublication(store, store.activeProjectId, publication);
    repository.save(store);

    const reloaded = repository.load(defaultGift).store;
    const project = repository.get(reloaded, reloaded.activeProjectId)!;
    expect(project.publication).toEqual(publication);

    const edited = repository.saveGift(reloaded, project.id, { ...defaultGift, recipientName: 'Otra persona' });
    expect(hasUnpublishedChanges(repository.get(edited, project.id)?.publication ?? null, repository.get(edited, project.id)!.gift)).toBe(true);
    expect(repository.get(edited, project.id)?.publication?.gift.url).toBe(publication.gift.url);
    expect(storage.getItem(PROJECT_STORAGE_KEY)).toContain('published-a');
  });

  it('imports into a new unpublished project and exports only its GiftFile', () => {
    const { repository } = createRepository();
    let store = repository.load(defaultGift).store;
    const originalId = store.activeProjectId;
    const importedGift = { ...defaultGift, recipientName: 'Importada' };
    store = repository.createImported(store, importedGift);

    const imported = repository.get(store, store.activeProjectId)!;
    expect(imported.id).not.toBe(originalId);
    expect(imported.name).toBe(IMPORTED_PROJECT_NAME);
    expect(imported.gift).toEqual(importedGift);
    expect(imported.publication).toBeUndefined();
    expect(createGiftFile(imported.gift)).toEqual({ schema: 'abrelo.gift', version: 1, gift: importedGift });
    expect(JSON.stringify(createGiftFile(imported.gift))).not.toContain(imported.id);
  });

  it('does not persist manipulated imports or invalid Creator edits', () => {
    const { repository, storage } = createRepository();
    const store = repository.load(defaultGift).store;
    const invalidTitleGift = {
      ...defaultGift,
      intro: {
        ...defaultGift.intro,
        title: 'T'.repeat(MAX_GIFT_TITLE_CHARACTERS + 1),
      },
    };
    const invalidMessageGift = {
      ...defaultGift,
      letter: {
        ...defaultGift.letter,
        message: 'M'.repeat(MAX_GIFT_MESSAGE_CHARACTERS + 1),
      },
    };

    expect(() => repository.createImported(store, invalidTitleGift)).toThrow(/80 caracteres/);
    expect(() => repository.saveGift(store, store.activeProjectId, invalidMessageGift)).toThrow(/500 caracteres/);
    expect(store.projects).toHaveLength(1);
    expect(store.projects[0].gift).toEqual(defaultGift);
    expect(storage.getItem(PROJECT_STORAGE_KEY)).toBeNull();
  });

  it('rejects invalid stored personalization while recovering valid sibling projects', () => {
    const { repository, storage } = createRepository();
    const validStore = repository.load(defaultGift).store;
    const invalidProject = {
      ...validStore.projects[0],
      id: 'invalid-personalization',
      gift: {
        ...defaultGift,
        intro: {
          ...defaultGift.intro,
          title: 'T'.repeat(MAX_GIFT_TITLE_CHARACTERS + 1),
        },
      },
    };
    storage.setItem(PROJECT_STORAGE_KEY, JSON.stringify({
      ...validStore,
      projects: [...validStore.projects, invalidProject],
      activeProjectId: invalidProject.id,
    }));

    const recovered = repository.load(defaultGift);
    expect(recovered.warning).toBeNull();
    expect(recovered.store.projects).toHaveLength(1);
    expect(recovered.store.projects[0].gift).toEqual(defaultGift);
    expect(recovered.store.activeProjectId).toBe(validStore.activeProjectId);
  });

  it('persists a new project created from a template without storing template metadata', () => {
    const { repository } = createRepository();
    const birthday = getGiftTemplate('birthday');
    let store = repository.load(defaultGift).store;
    store = repository.create(store, birthday.createGift(), birthday.name);
    repository.save(store);

    const reloaded = repository.load(defaultGift).store;
    const project = repository.get(reloaded, reloaded.activeProjectId)!;
    expect(project.name).toBe('Cumpleaños');
    expect(project.gift).toEqual(birthday.createGift());
    expect(JSON.stringify(project)).not.toContain('templateId');
  });

  it('keeps two projects created from the same template independent after editing one', () => {
    const { repository } = createRepository();
    const birthday = getGiftTemplate('birthday');
    let store = repository.load(defaultGift).store;
    store = repository.create(store, birthday.createGift(), birthday.name);
    const projectAId = store.activeProjectId;
    store = repository.create(store, birthday.createGift(), birthday.name);
    const projectBId = store.activeProjectId;

    const projectA = repository.get(store, projectAId)!;
    store = repository.saveGift(store, projectAId, {
      ...projectA.gift,
      recipientName: 'Sofía',
      gift: { ...projectA.gift.gift, title: 'Una cena especial' },
    });

    expect(repository.get(store, projectAId)?.gift.recipientName).toBe('Sofía');
    expect(repository.get(store, projectBId)?.gift.recipientName).toBe('');
    expect(repository.get(store, projectBId)?.gift.gift.title).toBe('Un plan elegido por ti');
  });

  it('reports local storage write failures without corrupting the in-memory project state', () => {
    const { repository, storage } = createRepository();
    const store = repository.load(defaultGift).store;
    storage.shouldFailWrites = true;

    expect(() => repository.save(store)).toThrow(ProjectStorageError);
    expect(repository.get(store, store.activeProjectId)?.gift).toEqual(defaultGift);
  });
});

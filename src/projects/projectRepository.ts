import { LEGACY_GIFT_DRAFT_STORAGE_KEY, readLegacyGiftDraft } from '../lib/giftDraftStore';
import { parseGiftFile, type GiftConfig } from '../models/giftConfig';
import { parseCreatorPublication, type CreatorPublication } from '../publishing/creatorPublication';
import {
  PROJECT_STORAGE_VERSION,
  type GiftProject,
  type GiftProjectStore,
} from './giftProject';

export const PROJECT_STORAGE_KEY = 'abrelo.projects.v1';
export const DEFAULT_PROJECT_NAME = 'Nuevo regalo';
export const IMPORTED_PROJECT_NAME = 'Regalo importado';

export class ProjectStorageError extends Error {
  constructor() {
    super('No pudimos guardar tus proyectos en este navegador.');
  }
}

export interface ProjectRepositoryLoadResult {
  store: GiftProjectStore;
  legacyMigrationPending: boolean;
  warning: string | null;
}

interface ProjectRepositoryOptions {
  storage: Storage;
  createId?: () => string;
  now?: () => string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function assertNonEmptyString(value: unknown, fieldName: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`Campo inválido: ${fieldName}`);
  }

  return value;
}

function assertTimestamp(value: unknown, fieldName: string): string {
  const timestamp = assertNonEmptyString(value, fieldName);

  if (Number.isNaN(Date.parse(timestamp))) {
    throw new Error(`Fecha inválida: ${fieldName}`);
  }

  return timestamp;
}

function cloneGift(gift: GiftConfig): GiftConfig {
  return JSON.parse(JSON.stringify(gift)) as GiftConfig;
}

function createSecureProjectId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const values = crypto.getRandomValues(new Uint8Array(16));
    values[6] = (values[6] & 0x0f) | 0x40;
    values[8] = (values[8] & 0x3f) | 0x80;
    const hex = Array.from(values, (value) => value.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }

  throw new Error('Este navegador no puede crear identificadores de proyecto seguros.');
}

function parseProject(value: unknown): GiftProject {
  if (!isRecord(value)) {
    throw new Error('Proyecto inválido');
  }

  let publication: CreatorPublication | undefined;
  if (value.publication !== undefined) {
    try {
      publication = parseCreatorPublication(value.publication);
    } catch {
      publication = undefined;
    }
  }

  return {
    id: assertNonEmptyString(value.id, 'project.id'),
    name: typeof value.name === 'string' ? value.name : DEFAULT_PROJECT_NAME,
    gift: parseGiftFile(value.gift),
    createdAt: assertTimestamp(value.createdAt, 'project.createdAt'),
    updatedAt: assertTimestamp(value.updatedAt, 'project.updatedAt'),
    ...(publication ? { publication } : {}),
  };
}

function parseStore(value: unknown): GiftProjectStore {
  if (!isRecord(value) || value.version !== PROJECT_STORAGE_VERSION || !Array.isArray(value.projects)) {
    throw new Error('Almacenamiento de proyectos inválido');
  }

  const projects = value.projects.flatMap((project) => {
    try {
      return [parseProject(project)];
    } catch {
      return [];
    }
  });

  if (projects.length === 0) {
    throw new Error('No hay proyectos recuperables');
  }

  const activeProjectId = typeof value.activeProjectId === 'string'
    && projects.some((project) => project.id === value.activeProjectId)
    ? value.activeProjectId
    : projects[0].id;

  return {
    version: PROJECT_STORAGE_VERSION,
    activeProjectId,
    projects,
  };
}

function sameGift(left: GiftConfig, right: GiftConfig): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

export class ProjectRepository {
  private readonly storage: Storage;
  private readonly createId: () => string;
  private readonly now: () => string;

  constructor({ storage, createId = createSecureProjectId, now = () => new Date().toISOString() }: ProjectRepositoryOptions) {
    this.storage = storage;
    this.createId = createId;
    this.now = now;
  }

  load(defaultGift: GiftConfig): ProjectRepositoryLoadResult {
    let savedProjects: string | null;
    let storageWarning: string | null = null;

    try {
      savedProjects = this.storage.getItem(PROJECT_STORAGE_KEY);
    } catch {
      return {
        store: this.createFirstStore(defaultGift),
        legacyMigrationPending: false,
        warning: 'No pudimos recuperar los proyectos guardados. Empezamos con un regalo nuevo.',
      };
    }

    if (savedProjects) {
      try {
        return {
          store: parseStore(JSON.parse(savedProjects)),
          legacyMigrationPending: false,
          warning: null,
        };
      } catch {
        storageWarning = 'No pudimos recuperar los proyectos guardados. Empezamos con un regalo nuevo.';
      }
    }

    const legacyGift = readLegacyGiftDraft(this.storage);
    if (legacyGift) {
      return {
        store: this.createFirstStore(legacyGift),
        legacyMigrationPending: true,
        warning: storageWarning,
      };
    }

    return {
      store: this.createFirstStore(defaultGift),
      legacyMigrationPending: false,
      warning: storageWarning,
    };
  }

  list(store: GiftProjectStore): GiftProject[] {
    return store.projects;
  }

  get(store: GiftProjectStore, projectId: string): GiftProject | null {
    return store.projects.find((project) => project.id === projectId) ?? null;
  }

  create(store: GiftProjectStore, gift: GiftConfig, name = DEFAULT_PROJECT_NAME): GiftProjectStore {
    const project = this.createProject(gift, name);
    return {
      ...store,
      activeProjectId: project.id,
      projects: [...store.projects, project],
    };
  }

  createImported(store: GiftProjectStore, gift: GiftConfig): GiftProjectStore {
    return this.create(store, gift, IMPORTED_PROJECT_NAME);
  }

  rename(store: GiftProjectStore, projectId: string, name: string): GiftProjectStore {
    const project = this.requireProject(store, projectId);
    const nextName = name.trim() || DEFAULT_PROJECT_NAME;
    if (project.name === nextName) {
      return store;
    }

    return this.updateProject(store, projectId, (project) => ({
      ...project,
      name: nextName,
      updatedAt: this.now(),
    }));
  }

  saveGift(store: GiftProjectStore, projectId: string, gift: GiftConfig): GiftProjectStore {
    const project = this.requireProject(store, projectId);
    if (sameGift(project.gift, gift)) {
      return store;
    }

    return this.updateProject(store, projectId, (current) => ({
      ...current,
      gift: cloneGift(gift),
      updatedAt: this.now(),
    }));
  }

  setPublication(store: GiftProjectStore, projectId: string, publication: CreatorPublication): GiftProjectStore {
    return this.updateProject(store, projectId, (project) => ({
      ...project,
      publication,
      updatedAt: this.now(),
    }));
  }

  select(store: GiftProjectStore, projectId: string): GiftProjectStore {
    this.requireProject(store, projectId);
    return { ...store, activeProjectId: projectId };
  }

  duplicate(store: GiftProjectStore, projectId: string): GiftProjectStore {
    const source = this.requireProject(store, projectId);
    const duplicate = this.createProject(cloneGift(source.gift), `${source.name || DEFAULT_PROJECT_NAME} copia`);

    return {
      ...store,
      activeProjectId: duplicate.id,
      projects: [...store.projects, duplicate],
    };
  }

  delete(store: GiftProjectStore, projectId: string, defaultGift: GiftConfig): GiftProjectStore {
    const index = store.projects.findIndex((project) => project.id === projectId);
    if (index === -1) {
      return store;
    }

    const projects = store.projects.filter((project) => project.id !== projectId);
    if (projects.length === 0) {
      return this.createFirstStore(defaultGift);
    }

    const nextActive = store.activeProjectId === projectId
      ? (projects[index] ?? projects[index - 1]).id
      : store.activeProjectId;

    return { ...store, activeProjectId: nextActive, projects };
  }

  save(store: GiftProjectStore): void {
    try {
      this.storage.setItem(PROJECT_STORAGE_KEY, JSON.stringify(store));
    } catch {
      throw new ProjectStorageError();
    }
  }

  completeLegacyMigration(): void {
    try {
      this.storage.removeItem(LEGACY_GIFT_DRAFT_STORAGE_KEY);
    } catch {
      // The new project envelope is already safe; retaining the legacy key is harmless.
    }
  }

  private createFirstStore(gift: GiftConfig): GiftProjectStore {
    const project = this.createProject(gift, DEFAULT_PROJECT_NAME);
    return {
      version: PROJECT_STORAGE_VERSION,
      activeProjectId: project.id,
      projects: [project],
    };
  }

  private createProject(gift: GiftConfig, name: string): GiftProject {
    const timestamp = this.now();
    return {
      id: this.createId(),
      name,
      gift: cloneGift(gift),
      createdAt: timestamp,
      updatedAt: timestamp,
    };
  }

  private updateProject(
    store: GiftProjectStore,
    projectId: string,
    update: (project: GiftProject) => GiftProject,
  ): GiftProjectStore {
    this.requireProject(store, projectId);
    return {
      ...store,
      projects: store.projects.map((project) => project.id === projectId ? update(project) : project),
    };
  }

  private requireProject(store: GiftProjectStore, projectId: string): GiftProject {
    const project = this.get(store, projectId);
    if (!project) {
      throw new Error('Proyecto no encontrado');
    }

    return project;
  }
}

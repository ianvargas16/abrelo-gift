import { useEffect, useRef, useState } from 'react';
import { defaultGift } from './config/defaultGift';
import { createGiftDownloadName, createGiftFile, parseCreatorGiftConfig } from './models/giftConfig';
import { getCurrentRoute, navigateToRoute } from './lib/routes';
import { ProjectRepository } from './projects/projectRepository';
import { CreatorView } from './views/CreatorView';
import { PreviewView } from './views/PreviewView';
import { RuntimeView } from './views/RuntimeView';
import type { GiftConfig } from './models/giftConfig';
import type { CreatorPublication } from './publishing/creatorPublication';
import type { GiftTemplate } from './templates/giftTemplates';

const EMPTY_MEMORY_IMAGE_FILES: Record<string, File> = {};

export default function App() {
  const [repository] = useState(() => new ProjectRepository({ storage: window.localStorage }));
  const [initialProjects] = useState(() => repository.load(defaultGift));
  const [projectStore, setProjectStore] = useState(initialProjects.store);
  const [storageError, setStorageError] = useState(initialProjects.warning ?? '');
  const [backgroundImageFile, setBackgroundImageFile] = useState<File | null>(null);
  const [backgroundImagePreviewUrl, setBackgroundImagePreviewUrl] = useState('');
  const [memoryImageFilesByProject, setMemoryImageFilesByProject] = useState<Record<string, Record<string, File>>>({});
  const [memoryImagePreviewUrls, setMemoryImagePreviewUrls] = useState<Record<string, string>>({});
  const legacyMigrationPending = useRef(initialProjects.legacyMigrationPending);
  const [route, setRoute] = useState(() => getCurrentRoute(window.location.hash));
  const activeProject = repository.get(projectStore, projectStore.activeProjectId) ?? projectStore.projects[0];
  const gift = activeProject.gift;
  const memoryImageFiles = memoryImageFilesByProject[activeProject.id] ?? EMPTY_MEMORY_IMAGE_FILES;
  const setActiveMemoryImageFiles = (files: Record<string, File>) => {
    setMemoryImageFilesByProject((current) => ({ ...current, [activeProject.id]: files }));
  };

  useEffect(() => {
    if (!backgroundImageFile) {
      setBackgroundImagePreviewUrl('');
      return undefined;
    }

    const objectUrl = URL.createObjectURL(backgroundImageFile);
    setBackgroundImagePreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [backgroundImageFile]);

  useEffect(() => {
    const urls = Object.fromEntries(
      Object.entries(memoryImageFiles).map(([id, file]) => [id, URL.createObjectURL(file)]),
    );
    setMemoryImagePreviewUrls(urls);
    return () => Object.values(urls).forEach((url) => URL.revokeObjectURL(url));
  }, [memoryImageFiles]);

  useEffect(() => {
    setBackgroundImageFile(null);
  }, [activeProject.id]);

  useEffect(() => {
    try {
      repository.save(projectStore);
      if (legacyMigrationPending.current) {
        repository.completeLegacyMigration();
        legacyMigrationPending.current = false;
      }
      setStorageError((current) => current.startsWith('No pudimos guardar') ? '' : current);
    } catch {
      setStorageError('No pudimos guardar tus cambios en este navegador. Puedes seguir editando, pero evita cerrar esta ventana hasta resolverlo.');
    }
  }, [projectStore, repository]);

  useEffect(() => {
    const syncRoute = () => setRoute(getCurrentRoute(window.location.hash));
    window.addEventListener('hashchange', syncRoute);
    return () => window.removeEventListener('hashchange', syncRoute);
  }, []);

  const exportGift = () => {
    const payload = JSON.stringify(createGiftFile(gift), null, 2);
    const url = URL.createObjectURL(new Blob([payload], { type: 'application/json' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = createGiftDownloadName(gift);
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const importGift = async (file: File) => {
    try {
      const parsed = JSON.parse(await file.text());
      const importedGift = parseCreatorGiftConfig(parsed);
      setProjectStore((current) => repository.createImported(current, importedGift));
    } catch {
      window.alert('No pude importar ese archivo. Usa un .gift.json exportado por Ábrelo.');
    }
  };

  return route === 'creator' ? (
    <CreatorView
      gift={gift}
      project={activeProject}
      projects={repository.list(projectStore)}
      storageError={storageError}
      backgroundImageFile={backgroundImageFile}
      backgroundImagePreviewUrl={backgroundImagePreviewUrl}
      memoryImageFiles={memoryImageFiles}
      memoryImagePreviewUrls={memoryImagePreviewUrls}
      onMemoryImageFilesChange={setActiveMemoryImageFiles}
      onBackgroundImageChange={setBackgroundImageFile}
      onChange={(nextGift: GiftConfig) => setProjectStore((current) => repository.saveGift(current, current.activeProjectId, nextGift))}
      onPreview={() => navigateToRoute('preview')}
      onReset={() => {
        setBackgroundImageFile(null);
        setActiveMemoryImageFiles({});
        setProjectStore((current) => repository.saveGift(current, current.activeProjectId, defaultGift));
      }}
      onExport={exportGift}
      onImport={importGift}
      publication={activeProject.publication ?? null}
      onPublicationChange={(publication: CreatorPublication) => setProjectStore((current) => repository.setPublication(current, current.activeProjectId, publication))}
      onCreateProject={(template: GiftTemplate) => setProjectStore((current) => repository.create(current, template.createGift(), template.name))}
      onSelectProject={(projectId: string) => setProjectStore((current) => repository.select(current, projectId))}
      onRenameProject={(projectId: string, name: string) => setProjectStore((current) => repository.rename(current, projectId, name))}
      onDuplicateProject={(projectId: string) => setProjectStore((current) => repository.duplicate(current, projectId))}
      onDeleteProject={(projectId: string) => setProjectStore((current) => repository.delete(current, projectId, defaultGift))}
    />
  ) : route === 'preview' ? (
    <PreviewView
      gift={gift}
      backgroundImagePreviewUrl={backgroundImagePreviewUrl}
      memoryImageUrls={memoryImagePreviewUrls}
      onBackToCreator={() => navigateToRoute('creator')}
    />
  ) : (
    <RuntimeView gift={gift} />
  );
}

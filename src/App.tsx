import { useEffect, useState } from 'react';
import { defaultGift } from './config/defaultGift';
import { loadGiftDraft, saveGiftDraft } from './lib/giftDraftStore';
import { createGiftDownloadName, createGiftFile, parseGiftFile } from './models/giftConfig';
import { getCurrentRoute, navigateToRoute } from './lib/routes';
import { CreatorView } from './views/CreatorView';
import { PreviewView } from './views/PreviewView';
import { RuntimeView } from './views/RuntimeView';
import type { GiftConfig } from './models/giftConfig';
import type { CreatorPublication } from './publishing/creatorPublication';

export default function App() {
  const [gift, setGift] = useState<GiftConfig>(() => loadGiftDraft(defaultGift));
  const [publication, setPublication] = useState<CreatorPublication | null>(null);
  const [route, setRoute] = useState(() => getCurrentRoute(window.location.hash));

  useEffect(() => {
    saveGiftDraft(gift);
  }, [gift]);

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
      setGift(parseGiftFile(parsed));
    } catch {
      window.alert('No pude importar ese archivo. Usa un .gift.json exportado por Ábrelo.');
    }
  };

  return route === 'creator' ? (
    <CreatorView
      gift={gift}
      onChange={setGift}
      onPreview={() => navigateToRoute('preview')}
      onReset={() => setGift(defaultGift)}
      onExport={exportGift}
      onImport={importGift}
      publication={publication}
      onPublicationChange={setPublication}
    />
  ) : route === 'preview' ? (
    <PreviewView gift={gift} onBackToCreator={() => navigateToRoute('creator')} />
  ) : (
    <RuntimeView gift={gift} />
  );
}

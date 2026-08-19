import { useEffect, useState } from 'react';
import { defaultGift } from './config/defaultGift';
import { EnvelopeExperience } from './components/EnvelopeExperience';
import { GiftEditor } from './components/GiftEditor';
import type { GiftConfig } from './types/gift';

type Mode = 'gift' | 'editor';
const STORAGE_KEY = 'abrelo.gift.v1';

function loadGift(): GiftConfig {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? { ...defaultGift, ...JSON.parse(saved) } : defaultGift;
  } catch {
    return defaultGift;
  }
}

export default function App() {
  const [gift, setGift] = useState<GiftConfig>(loadGift);
  const [mode, setMode] = useState<Mode>(() => new URLSearchParams(location.search).get('editor') === '1' ? 'editor' : 'gift');

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(gift));
  }, [gift]);

  const exportGift = () => {
    const payload = JSON.stringify({ schema: 'abrelo.gift', version: 1, gift }, null, 2);
    const url = URL.createObjectURL(new Blob([payload], { type: 'application/json' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${gift.recipientName.trim().toLowerCase().replace(/[^a-z0-9áéíóúñ]+/gi, '-') || 'regalo'}.gift.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const importGift = async (file: File) => {
    try {
      const parsed = JSON.parse(await file.text());
      const imported = parsed?.schema === 'abrelo.gift' ? parsed.gift : parsed;
      if (!imported || typeof imported !== 'object') throw new Error('Formato inválido');
      setGift({ ...defaultGift, ...imported });
    } catch {
      window.alert('No pude importar ese archivo. Usa un .gift.json exportado por Ábrelo.');
    }
  };

  return mode === 'editor' ? (
    <GiftEditor gift={gift} onChange={setGift} onPreview={() => setMode('gift')} onReset={() => setGift(defaultGift)} onExport={exportGift} onImport={importGift} />
  ) : (
    <EnvelopeExperience gift={gift} onOpenEditor={() => setMode('editor')} />
  );
}

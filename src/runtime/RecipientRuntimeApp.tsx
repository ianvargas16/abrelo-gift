import { useEffect, useState } from 'react';
import { RuntimeView } from '../views/RuntimeView';
import type { RuntimeBootstrapResult } from './runtimeBootstrap';

interface RecipientRuntimeAppProps {
  bootstrap: RuntimeBootstrapResult;
}

export const RECIPIENT_PREPARATION_DURATION = 320;

export function getRecipientPreparationDuration(prefersReducedMotion: boolean): number {
  return prefersReducedMotion ? 0 : RECIPIENT_PREPARATION_DURATION;
}

function RuntimePreparation({ theme }: { theme: string }) {
  return (
    <div className={`runtime-preparation ${theme}`} role="status" aria-live="polite">
      <div className="runtime-preparation-card">
        <span className="runtime-preparation-mark" aria-hidden="true">✦</span>
        <p>Preparando algo para ti</p>
      </div>
    </div>
  );
}

export function RecipientRuntimeApp({ bootstrap }: RecipientRuntimeAppProps) {
  const [isPreparing, setIsPreparing] = useState(true);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    const duration = getRecipientPreparationDuration(prefersReducedMotion);
    const timeout = window.setTimeout(() => setIsPreparing(false), duration);
    return () => window.clearTimeout(timeout);
  }, []);

  const theme = bootstrap.status === 'ready' ? `theme-${bootstrap.gift.theme}` : 'theme-rose';

  return <>
    {bootstrap.status === 'ready' ? (
      <RuntimeView gift={bootstrap.gift} />
    ) : (
      <main className="runtime-failure theme-rose">
        <section className="runtime-failure-card" role="alert">
          <span className="runtime-failure-mark" aria-hidden="true">✦</span>
          <h1>Este regalo no está disponible.</h1>
          <p>Revisa el enlace o inténtalo de nuevo más tarde.</p>
        </section>
      </main>
    )}
    {isPreparing && <RuntimePreparation theme={theme} />}
  </>;
}

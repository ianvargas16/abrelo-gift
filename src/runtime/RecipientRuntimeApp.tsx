import { useEffect, useState, type CSSProperties } from 'react';
import { RuntimeView } from '../views/RuntimeView';
import type { GiftConfig } from '../models/giftConfig';
import type { RuntimeBootstrapResult } from './runtimeBootstrap';
import { getThemeCssVariables, resolveTheme, type ThemeDefinition } from '../themes/themeRegistry';

interface RecipientRuntimeAppProps {
  bootstrap: RuntimeBootstrapResult;
}

export const RECIPIENT_PREPARATION_DURATION = 650;

export function getRecipientPreparationDuration(prefersReducedMotion: boolean): number {
  return prefersReducedMotion ? 0 : RECIPIENT_PREPARATION_DURATION;
}

export function getRecipientDisplayState(
  bootstrap: RuntimeBootstrapResult,
  isPreparing: boolean,
): 'loading' | 'error' | 'ready' {
  if (bootstrap.status === 'error') return 'error';
  return isPreparing ? 'loading' : 'ready';
}

export function getRecipientEntryCopy(gift: GiftConfig): { eyebrow: string; title: string; note: string } {
  const recipientName = gift.recipientName.trim();
  return {
    eyebrow: recipientName ? `${recipientName}, tienes un regalo` : 'Tienes un regalo',
    title: gift.intro.title.trim() || 'Una sorpresa preparada para ti',
    note: 'Está lista para abrirse.',
  };
}

function RuntimePreparation({ theme, gift }: { theme: ThemeDefinition; gift: GiftConfig }) {
  const copy = getRecipientEntryCopy(gift);
  return (
    <div
      className={`runtime-preparation ${theme.className}`}
      data-recipient-state="loading"
      style={getThemeCssVariables(theme) as CSSProperties}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="runtime-preparation-card">
        <span className="runtime-preparation-mark" aria-hidden="true">✦</span>
        <span className="runtime-preparation-eyebrow">{copy.eyebrow}</span>
        <h1>{copy.title}</h1>
        <p>{copy.note}</p>
      </div>
    </div>
  );
}

export function RecipientRuntimeApp({ bootstrap }: RecipientRuntimeAppProps) {
  const [isPreparing, setIsPreparing] = useState(bootstrap.status === 'ready');

  useEffect(() => {
    if (bootstrap.status === 'error') {
      setIsPreparing(false);
      return;
    }

    setIsPreparing(true);
    const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    const duration = getRecipientPreparationDuration(prefersReducedMotion);
    const timeout = window.setTimeout(() => setIsPreparing(false), duration);
    return () => window.clearTimeout(timeout);
  }, [bootstrap.status]);

  const theme = resolveTheme(bootstrap.status === 'ready' ? bootstrap.gift.theme : undefined);
  const retry = () => window.location.reload();
  const displayState = getRecipientDisplayState(bootstrap, isPreparing);

  if (displayState === 'loading' && bootstrap.status === 'ready') {
    return <RuntimePreparation theme={theme} gift={bootstrap.gift} />;
  }

  return (
    <div data-recipient-state={displayState}>
      {bootstrap.status === 'ready' ? (
      <RuntimeView gift={bootstrap.gift} />
    ) : (
      <main className={`runtime-failure ${theme.className}`} style={getThemeCssVariables(theme) as CSSProperties}>
        <section className="runtime-failure-card" role="alert">
          <span className="runtime-failure-mark" aria-hidden="true">✦</span>
          <h1>Este regalo ya no está disponible.</h1>
          <p>Puede ser un problema temporal. Inténtalo de nuevo en un momento.</p>
          <button type="button" className="runtime-retry-button" onClick={retry}>Volver a intentar</button>
        </section>
      </main>
    )}
    </div>
  );
}

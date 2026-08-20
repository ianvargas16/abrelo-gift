import { RuntimeView } from '../views/RuntimeView';
import type { RuntimeBootstrapResult } from './runtimeBootstrap';

interface RecipientRuntimeAppProps {
  bootstrap: RuntimeBootstrapResult;
}

export function RecipientRuntimeApp({ bootstrap }: RecipientRuntimeAppProps) {
  if (bootstrap.status === 'ready') {
    return <RuntimeView gift={bootstrap.gift} />;
  }

  return (
    <main className="runtime-failure theme-rose">
      <section className="runtime-failure-card" role="alert">
        <span className="runtime-failure-mark" aria-hidden="true">✦</span>
        <h1>Este regalo no está disponible.</h1>
        <p>Puede que el enlace haya vencido o que el regalo aún no esté listo.</p>
      </section>
    </main>
  );
}

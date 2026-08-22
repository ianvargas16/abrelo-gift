interface CreationGuideProps {
  hasRecipient: boolean;
  hasMessage: boolean;
  hasGift: boolean;
  isPublished: boolean;
}

interface GuideStep {
  label: string;
  detail: string;
  state: 'complete' | 'current' | 'upcoming';
}

export function CreationGuide({ hasRecipient, hasMessage, hasGift, isPublished }: CreationGuideProps) {
  const isPersonalized = hasRecipient && hasMessage && hasGift;
  const steps: GuideStep[] = [
    { label: 'Idea', detail: 'Tu punto de partida', state: 'complete' },
    {
      label: 'Personaliza',
      detail: isPersonalized ? 'Tu historia ya está escrita' : 'Dale una voz propia',
      state: isPersonalized ? 'complete' : 'current',
    },
    {
      label: 'Publica',
      detail: isPublished ? 'Ya está en camino' : isPersonalized ? 'Listo para entregar' : 'Cuando esté listo',
      state: isPublished ? 'complete' : isPersonalized ? 'current' : 'upcoming',
    },
  ];
  const missingDetails = [
    !hasRecipient && 'A quién va dirigido',
    !hasMessage && 'Unas palabras personales',
    !hasGift && 'El detalle que vas a regalar',
  ].filter((detail): detail is string => Boolean(detail));

  return (
    <section className="creation-guide" aria-labelledby="creation-guide-title">
      <div className="creation-guide-head">
        <div>
          <p className="section-kicker">Tu recorrido</p>
          <h3 id="creation-guide-title">De una idea a una sorpresa.</h3>
        </div>
        <span className="creation-guide-count" aria-label={`${3 - missingDetails.length} de 3 detalles principales listos`}>
          {3 - missingDetails.length}/3
        </span>
      </div>

      <ol className="creation-progress">
        {steps.map((step, index) => (
          <li key={step.label} className={`is-${step.state}`}>
            <span aria-hidden="true">{step.state === 'complete' ? '✓' : index + 1}</span>
            <div>
              <strong>{step.label}</strong>
              <small>{step.detail}</small>
            </div>
          </li>
        ))}
      </ol>

      {missingDetails.length > 0 ? (
        <div className="creation-guidance" aria-live="polite">
          <p>Para que se sienta realmente suyo, añade:</p>
          <ul>
            {missingDetails.map((detail) => <li key={detail}>{detail}</li>)}
          </ul>
        </div>
      ) : (
        <p className="creation-ready" aria-live="polite">
          {isPublished ? 'Tu sorpresa ya tiene un lugar al que llegar.' : 'La historia está lista. Recorre la experiencia y entrégala cuando quieras.'}
        </p>
      )}
    </section>
  );
}

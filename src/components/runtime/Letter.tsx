interface LetterProps {
  title: string;
  message: string;
  senderName: string;
  onReveal: () => void;
}

export function Letter({ title, message, senderName, onReveal }: LetterProps) {
  const heading = title.trim() || 'Carta';
  const body = message.trim();
  const signature = senderName.trim();

  return (
    <article className="gift-letter">
      <div className="letter-mark">✦</div>
      <div className="letter-header">
        <span className="letter-label">Carta</span>
        <h2>{heading}</h2>
      </div>
      {body && <p>{body}</p>}
      {signature && <div className="letter-signature">— {signature}</div>}
      <button className="reveal-button" onClick={onReveal}>Descubrir mi regalo</button>
    </article>
  );
}

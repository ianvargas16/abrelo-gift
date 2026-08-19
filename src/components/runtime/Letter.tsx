interface LetterProps {
  message: string;
  senderName: string;
  onReveal: () => void;
}

export function Letter({ message, senderName, onReveal }: LetterProps) {
  return (
    <article className="birthday-letter">
      <div className="letter-mark">✦</div>
      <p>{message}</p>
      <div className="letter-signature">— {senderName}</div>
      <button className="reveal-button" onClick={onReveal}>Descubrir mi regalo</button>
    </article>
  );
}

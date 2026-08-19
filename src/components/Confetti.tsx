export function Confetti() {
  return (
    <div className="confetti" aria-hidden="true">
      {Array.from({ length: 42 }, (_, index) => (
        <i key={index} style={{ '--i': index } as React.CSSProperties} />
      ))}
    </div>
  );
}

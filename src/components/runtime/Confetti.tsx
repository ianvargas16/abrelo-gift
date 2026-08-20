export function Confetti() {
  const tones = [
    'var(--color-accent)',
    'var(--color-accent-strong)',
    'color-mix(in srgb, var(--color-accent) 54%, var(--color-paper))',
    'color-mix(in srgb, var(--color-accent-strong) 36%, var(--color-paper-secondary))',
  ];

  return (
    <div className="confetti" aria-hidden="true">
      {Array.from({ length: 20 }, (_, index) => {
        const style = {
          '--confetti-x': `${(index * 47) % 100}%`,
          '--confetti-duration': `${3.1 + (index % 6) * 0.2}s`,
          '--confetti-delay': `${0.3 + (index % 8) * 0.1}s`,
          '--confetti-drift': `${(index % 5 - 2) * 1.45}rem`,
          '--confetti-color': tones[index % tones.length],
          '--confetti-rotation': `${index * 19}deg`,
          '--confetti-width': `${0.3 + (index % 3) * 0.1}rem`,
          '--confetti-height': `${0.65 + (index % 4) * 0.12}rem`,
        } as React.CSSProperties;

        return <i key={index} style={style} />;
      })}
    </div>
  );
}

export function Confetti() {
  return (
    <div className="confetti" aria-hidden="true">
      {Array.from({ length: 30 }, (_, index) => {
        const style = {
          '--confetti-x': `${(index * 47) % 100}%`,
          '--confetti-duration': `${2.8 + (index % 7) * 0.22}s`,
          '--confetti-delay': `${0.34 + (index % 11) * 0.07}s`,
          '--confetti-drift': `${(index % 5 - 2) * 2}rem`,
          '--confetti-color': `hsl(${(index * 37 + 320) % 360} 55% 60%)`,
          '--confetti-rotation': `${index * 19}deg`,
        } as React.CSSProperties;

        return <i key={index} style={style} />;
      })}
    </div>
  );
}

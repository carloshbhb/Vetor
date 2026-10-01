type Bar = { label: string; pct: number; value: number };

const clampPct = (pct: number) => Math.min(100, Math.max(0, Math.round(pct)));

export default function ScoreBarsStatic({ bars }: { bars: Bar[] }) {
  if (!bars || bars.length === 0) return null;
  return (
    <div className="bars" role="list">
      {bars.map((bar, i) => (
        <div className="bar" role="listitem" key={i}>
          <span>{bar.label}</span>
          <i>
            <b style={{ width: `${clampPct(bar.pct)}%` }} />
          </i>
          <strong>{bar.value.toFixed(1).replace('.', ',')}</strong>
        </div>
      ))}
    </div>
  );
}

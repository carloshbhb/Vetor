type Bar = { label: string; pct: number; value: number };

const clampPct = (pct: number) => Math.min(100, Math.max(0, Math.round(pct)));

const validBar = (bar: Bar) =>
  typeof bar?.label === 'string' &&
  Number.isFinite(bar?.pct) &&
  Number.isFinite(bar?.value) &&
  (bar.value as number) > 0;

export default function ScoreBarsStatic({ bars }: { bars: Bar[] }) {
  const valid = Array.isArray(bars) ? bars.filter(validBar) : [];
  if (valid.length === 0) return null;
  return (
    <div className="bars" role="list">
      {valid.map((bar, i) => (
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

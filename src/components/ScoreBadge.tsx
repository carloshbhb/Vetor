interface ScoreBadgeProps {
  score: number;
  size?: 'sm' | 'md' | 'lg';
}

const sizeMap = {
  sm: { box: 40, font: 14 },
  md: { box: 56, font: 20 },
  lg: { box: 72, font: 28 },
};

function getColor(score: number): string {
  if (score >= 9) return '#22C55E';
  if (score >= 7) return 'var(--blue)';
  if (score >= 5) return '#F59E0B';
  return '#EF4444';
}

export default function ScoreBadge({ score, size = 'md' }: ScoreBadgeProps) {
  const { box, font } = sizeMap[size];
  const color = getColor(score);

  return (
    <div
      style={{
        width: `${box}px`,
        height: `${box}px`,
        borderRadius: '50%',
        border: `3px solid ${color}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: `${font}px`,
        fontWeight: 'bold',
        color,
        flexShrink: 0,
      }}
    >
      {score.toFixed(1)}
    </div>
  );
}

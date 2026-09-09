import { useCurrentFrame, spring, interpolate } from "remotion";

interface QRCodeAnimatedProps {
  url: string;
  size: number;
  delay: number;
}

export const QRCodeAnimated: React.FC<QRCodeAnimatedProps> = ({ url, size, delay }) => {
  const frame = useCurrentFrame();
  const localFrame = Math.max(0, frame - delay);

  const scaleSpring = spring({
    frame: localFrame,
    fps: 30,
    config: { stiffness: 200, damping: 10 },
  });

  const scale = interpolate(scaleSpring, [0, 1], [0, 1]);
  const opacity = interpolate(localFrame, [0, 5], [0, 1], { extrapolateRight: "clamp" });

  const qrModules = generateQRPattern(url, 21);

  return (
    <div
      style={{
        transform: `scale(${scale})`,
        opacity,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 12,
      }}
    >
      <div
        style={{
          width: size,
          height: size,
          background: "white",
          borderRadius: 16,
          padding: 16,
          boxShadow: "0 10px 40px rgba(108, 92, 231, 0.4)",
        }}
      >
        <svg viewBox={`0 0 ${qrModules.length} ${qrModules.length}`} width="100%" height="100%">
          {qrModules.map((row, y) =>
            row.map((cell, x) =>
              cell ? (
                <rect
                  key={`${x}-${y}`}
                  x={x}
                  y={y}
                  width={1}
                  height={1}
                  fill="#0A0A0F"
                />
              ) : null
            )
          )}
        </svg>
      </div>
      <div
        style={{
          color: "#888",
          fontSize: 14,
          fontFamily: "Inter, system-ui, sans-serif",
        }}
      >
        Escaneie para comprar
      </div>
    </div>
  );
};

function generateQRPattern(_data: string, size: number): boolean[][] {
  const grid: boolean[][] = Array.from({ length: size }, () =>
    Array.from({ length: size }, () => false)
  );

  const drawFinder = (startX: number, startY: number) => {
    for (let y = 0; y < 7; y++) {
      for (let x = 0; x < 7; x++) {
        if (
          y === 0 || y === 6 || x === 0 || x === 6 ||
          (y >= 2 && y <= 4 && x >= 2 && x <= 4)
        ) {
          grid[startY + y][startX + x] = true;
        }
      }
    }
  };

  drawFinder(0, 0);
  drawFinder(size - 7, 0);
  drawFinder(0, size - 7);

  for (let i = 8; i < size - 8; i++) {
    if (i % 2 === 0) grid[6][i] = true;
    grid[i][6] = true;
  }

  let hash = 0;
  for (let i = 0; i < _data.length; i++) {
    hash = (hash * 31 + _data.charCodeAt(i)) | 0;
  }

  for (let y = 9; y < size - 9; y++) {
    for (let x = 9; x < size - 9; x++) {
      if (((hash * (x + y + 1)) & 0xFF) > 140) {
        grid[y][x] = true;
      }
    }
  }

  return grid;
}

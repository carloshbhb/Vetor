import { interpolate, useCurrentFrame } from 'remotion';
import { theme } from '../styles/theme';
import { fonts } from '../styles/fonts';

interface ProductCardProps {
  name: string;
  imageUrl: string;
  price?: string;
  delay?: number;
  style?: React.CSSProperties;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  name,
  imageUrl,
  price,
  delay = 0,
  style = {},
}) => {
  const frame = useCurrentFrame();

  const opacity = interpolate(frame, [delay, delay + 20], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const translateX = interpolate(frame, [delay, delay + 25], [-100, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <div
      style={{
        opacity,
        transform: `translateX(${translateX}px)`,
        background: theme.surface,
        borderRadius: 24,
        padding: 40,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 24,
        border: `1px solid ${theme.surface2}`,
        width: 400,
        ...style,
      }}
    >
      <img
        src={imageUrl}
        alt={name}
        style={{
          width: 280,
          height: 280,
          objectFit: 'contain',
          borderRadius: 16,
        }}
      />
      <div
        style={{
          fontSize: 36,
          fontWeight: 'bold',
          color: theme.text,
          fontFamily: fonts.heading,
          textAlign: 'center',
        }}
      >
        {name}
      </div>
      {price && (
        <div
          style={{
            fontSize: 28,
            color: theme.blue,
            fontWeight: '600',
            fontFamily: fonts.body,
          }}
        >
          {price}
        </div>
      )}
    </div>
  );
};

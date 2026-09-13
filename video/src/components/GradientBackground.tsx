import { theme } from '../styles/theme';

interface GradientBackgroundProps {
  children: React.ReactNode;
}

export const GradientBackground: React.FC<GradientBackgroundProps> = ({ children }) => {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        background: theme.gradient,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 60,
        overflow: 'hidden',
      }}
    >
      {children}
    </div>
  );
};

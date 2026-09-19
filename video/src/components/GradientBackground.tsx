import { theme } from '../styles/theme';

interface GradientBackgroundProps {
  children: React.ReactNode;
  variant?: 'main' | 'dark' | 'accent';
}

export const GradientBackground: React.FC<GradientBackgroundProps> = ({ 
  children, 
  variant = 'main' 
}) => {
  const gradients = {
    main: 'radial-gradient(ellipse 80% 50% at 50% -20%, #1a2a4a 0%, #080C14 50%, #040810 100%)',
    dark: 'radial-gradient(ellipse 80% 50% at 50% -20%, #0f1a2e 0%, #060b14 50%, #03060c 100%)',
    accent: 'radial-gradient(ellipse 80% 50% at 50% -20%, #1e3a5f 0%, #0d1b2e 50%, #050a14 100%)',
  };

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        background: gradients[variant],
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 60,
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* Subtle grid overlay */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundImage: `
            linear-gradient(rgba(66, 133, 244, 0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(66, 133, 244, 0.03) 1px, transparent 1px)
          `,
          backgroundSize: '80px 80px',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />
      {/* Vignette */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.5) 100%)',
          pointerEvents: 'none',
          zIndex: 1,
        }}
      />
      <div style={{ position: 'relative', zIndex: 2 }}>
        {children}
      </div>
    </div>
  );
};
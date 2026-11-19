import React from 'react';
import { ThreeCanvas } from '@remotion/three';
import { useCurrentFrame, useVideoConfig } from 'remotion';

type ThreeMotionGraphicsSceneProps = {
  accentColor?: string;
};

/**
 * Optional transparent 3D overlay for future Remotion compositions.
 * It is intentionally not registered in Root.tsx, so existing videos remain unchanged.
 * All movement is derived from useCurrentFrame() for deterministic frame rendering.
 */
export const ThreeMotionGraphicsScene: React.FC<ThreeMotionGraphicsSceneProps> = ({
  accentColor = '#4285F4',
}) => {
  const { width, height } = useVideoConfig();

  return (
    <ThreeCanvas
      width={width}
      height={height}
      camera={{ position: [0, 0, 5], fov: 42 }}
      gl={{ alpha: true, antialias: true, preserveDrawingBuffer: true }}
    >
      <OrbitingProductGraphic accentColor={accentColor} />
    </ThreeCanvas>
  );
};

const OrbitingProductGraphic: React.FC<{ accentColor: string }> = ({ accentColor }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const seconds = frame / fps;

  return (
    <>
      <ambientLight intensity={0.85} />
      <directionalLight position={[4, 5, 6]} intensity={2.1} />
      <pointLight position={[-4, -2, 3]} intensity={32} color="#8AB4FF" />

      <group rotation={[0.08, seconds * 0.48, Math.sin(seconds * 0.7) * 0.06]}>
        <mesh>
          <icosahedronGeometry args={[1.08, 1]} />
          <meshPhysicalMaterial
            color={accentColor}
            metalness={0.58}
            roughness={0.24}
            clearcoat={0.9}
          />
        </mesh>

        <mesh rotation={[Math.PI / 2.15, 0, -seconds * 0.7]}>
          <torusGeometry args={[1.58, 0.018, 10, 144]} />
          <meshBasicMaterial color="#D6E4FF" transparent opacity={0.9} />
        </mesh>

        <mesh rotation={[0.35, Math.PI / 2.7, seconds * 0.42]}>
          <torusGeometry args={[1.82, 0.012, 8, 144]} />
          <meshBasicMaterial color={accentColor} transparent opacity={0.65} />
        </mesh>

        <mesh position={[1.82, Math.sin(seconds * 1.4) * 0.16, 0]}>
          <sphereGeometry args={[0.075, 20, 20]} />
          <meshBasicMaterial color="#FFFFFF" />
        </mesh>
      </group>
    </>
  );
};

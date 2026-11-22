import React from 'react';
import { ThreeCanvas } from '@remotion/three';
import { interpolate, useCurrentFrame, useVideoConfig } from 'remotion';

export type ThreeMotionVariant = 'orbit' | 'exploded' | 'hud' | 'isometric';

type ThreeMotionGraphicsSceneProps = {
  accentColor?: string;
  variant?: ThreeMotionVariant;
};

/**
 * Deterministic 3D motion layer for Remotion compositions.
 * The real product photography remains the hero source; this adds a distinct 3D
 * motion-graphics language around it. All animation is frame-driven for render safety.
 */
export const ThreeMotionGraphicsScene: React.FC<ThreeMotionGraphicsSceneProps> = ({
  accentColor = '#4285F4',
  variant = 'orbit',
}) => {
  const { width, height } = useVideoConfig();
  return (
    <ThreeCanvas
      width={width}
      height={height}
      camera={{ position: [0, 0, 8], fov: 42 }}
      gl={{ alpha: true, antialias: true, preserveDrawingBuffer: true }}
    >
      <ambientLight intensity={0.85} />
      <directionalLight position={[4, 5, 6]} intensity={2.1} />
      <pointLight position={[-4, -2, 3]} intensity={24} color="#8AB4FF" />
      <MotionGeometry accentColor={accentColor} variant={variant} />
    </ThreeCanvas>
  );
};

const MotionGeometry: React.FC<{ accentColor: string; variant: ThreeMotionVariant }> = ({ accentColor, variant }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const seconds = frame / fps;
  const reveal = interpolate(frame, [0, 24], [0, 1], { extrapolateRight: 'clamp' });
  const spin = seconds * 0.42;
  const scale = variant === 'isometric' ? 0.42 : 0.48;

  if (variant === 'exploded') {
    const spread = interpolate(reveal, [0, 1], [0.15, 1]);
    return (
      <group scale={scale} rotation={[0.22, spin * 0.25, -0.12]}>
        <group position={[0, 0.62 * spread, 0.28]}>
          <mesh><boxGeometry args={[3.1, 0.09, 1.95]} /><meshPhysicalMaterial color="#E8EDF5" metalness={0.72} roughness={0.24} transparent opacity={0.82} /></mesh>
        </group>
        <group position={[0, 0, 0]}>
          <mesh><boxGeometry args={[2.92, 0.12, 1.78]} /><meshPhysicalMaterial color="#18263A" metalness={0.7} roughness={0.3} /></mesh>
          <mesh position={[0, 0.075, 0]}><boxGeometry args={[2.65, 0.025, 1.5]} /><meshBasicMaterial color={accentColor} transparent opacity={0.75} /></mesh>
        </group>
        <group position={[0, -0.62 * spread, -0.28]}>
          <mesh><boxGeometry args={[3.05, 0.08, 1.9]} /><meshPhysicalMaterial color="#48566A" metalness={0.84} roughness={0.28} transparent opacity={0.9} /></mesh>
        </group>
        {[-1, 1].map((side) => (
          <mesh key={side} position={[side * 1.82, 0, 0]}><sphereGeometry args={[0.075, 18, 18]} /><meshBasicMaterial color={accentColor} /></mesh>
        ))}
      </group>
    );
  }

  if (variant === 'hud') {
    return (
      <group scale={scale} rotation={[0.18, spin * 0.3, 0]}>
        {[2.12, 2.42, 2.72].map((radius, index) => (
          <mesh key={radius} rotation={[Math.PI / 2.3 + index * 0.13, index * 0.32, spin * (index % 2 ? -0.7 : 0.7)]}>
            <torusGeometry args={[radius, 0.012 + index * 0.003, 8, 160]} />
            <meshBasicMaterial color={accentColor} transparent opacity={0.55 - index * 0.1} />
          </mesh>
        ))}
        {Array.from({ length: 8 }, (_, index) => {
          const angle = (Math.PI * 2 * index) / 8 + spin;
          return (
            <mesh key={index} position={[Math.cos(angle) * 2.42, Math.sin(angle) * 1.65, 0.15]}>
              <sphereGeometry args={[0.055, 16, 16]} />
              <meshBasicMaterial color={index % 2 ? '#FFFFFF' : accentColor} />
            </mesh>
          );
        })}
      </group>
    );
  }

  if (variant === 'isometric') {
    return (
      <group scale={scale} rotation={[0.95, spin * 0.12, -0.48]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.55, 0]}>
          <planeGeometry args={[7, 5, 14, 10]} />
          <meshBasicMaterial color={accentColor} wireframe transparent opacity={0.45} />
        </mesh>
        {[-1.2, 0, 1.2].map((x, index) => (
          <mesh key={x} position={[x, -0.08 + index * 0.12, 0.15]}>
            <boxGeometry args={[0.5, 0.8 + index * 0.25, 0.5]} />
            <meshPhysicalMaterial color={accentColor} metalness={0.55} roughness={0.3} transparent opacity={0.74} />
          </mesh>
        ))}
      </group>
    );
  }

  return (
    <group scale={scale} rotation={[0.12, spin * 0.55, Math.sin(seconds * 0.55) * 0.08]}>
      {[2.0, 2.35].map((radius, index) => (
        <mesh key={radius} rotation={[Math.PI / 2.2 + index * 0.3, index * 0.35, spin * (index ? -1 : 1)]}>
          <torusGeometry args={[radius, 0.022, 10, 160]} />
          <meshBasicMaterial color={index ? accentColor : '#D6E4FF'} transparent opacity={index ? 0.66 : 0.86} />
        </mesh>
      ))}
      {[0, 1, 2, 3].map((index) => {
        const angle = spin + (Math.PI / 2) * index;
        return (
          <mesh key={index} position={[Math.cos(angle) * 2.0, Math.sin(angle) * 1.48, 0.12]}>
            <sphereGeometry args={[0.07, 18, 18]} />
            <meshBasicMaterial color={index % 2 ? '#FFFFFF' : accentColor} />
          </mesh>
        );
      })}
    </group>
  );
};

import React, { Suspense, useMemo } from 'react';
import * as THREE from 'three';
import { useLoader, useThree } from '@react-three/fiber';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { ThreeCanvas } from '@remotion/three';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';

export type ProductModelProfile =
  | 'thermal-carafe'
  | 'smartphone'
  | 'tablet'
  | 'laptop'
  | 'headphones'
  | 'wearable'
  | 'unresolved';

export type ProductShot = 'hero' | 'macro' | 'exploded';

type Props = {
  profile: ProductModelProfile;
  shot: ProductShot;
  cameraMove: string;
  accent: string;
  modelUrl?: string;
};

const CARAFE_PROFILE = [
  new THREE.Vector2(0, -1.35),
  new THREE.Vector2(0.55, -1.35),
  new THREE.Vector2(0.7, -1.23),
  new THREE.Vector2(0.73, -1.12),
  new THREE.Vector2(0.77, 0.76),
  new THREE.Vector2(0.69, 0.93),
  new THREE.Vector2(0.58, 1.02),
  new THREE.Vector2(0.58, 1.34),
  new THREE.Vector2(0.47, 1.4),
  new THREE.Vector2(0, 1.4),
];

const useFrameProgress = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  return { frame, fps, seconds: frame / fps, progress: Math.min(1, frame / Math.max(1, durationInFrames - 1)) };
};

const CameraRig: React.FC<{ move: string }> = ({ move }) => {
  const { camera } = useThree();
  const { progress, seconds } = useFrameProgress();
  let x = 0;
  let y = 0.1;
  let z = 6.8;
  let lookY = 0;
  if (move === 'orbit') {
    x = Math.sin(seconds * 0.62) * 1.05;
    z = 6.8 + Math.cos(seconds * 0.62) * 0.3;
  } else if (move === 'macro-dolly') {
    z = interpolate(progress, [0, 1], [6.2, 4.55]);
    y = interpolate(progress, [0, 1], [0.02, 0.28]);
    lookY = 0.12;
  } else if (move === 'lateral-dolly') {
    x = interpolate(progress, [0, 1], [-0.95, 0.95]);
    z = 6.7;
  } else if (move === 'crane') {
    y = interpolate(progress, [0, 1], [0.95, -0.35]);
    z = 6.9;
    lookY = -0.12;
  } else if (move === 'push-in') {
    z = interpolate(progress, [0, 1], [7.5, 5.25]);
  } else if (move === 'arc-reveal') {
    x = interpolate(progress, [0, 1], [-1.45, 0.4]);
    z = interpolate(progress, [0, 1], [7.7, 6.1]);
    y = interpolate(progress, [0, 1], [0.55, 0.08]);
  }
  camera.position.set(x, y, z);
  camera.lookAt(0, lookY, 0);
  return null;
};

const CarafeModel: React.FC<{ shot: ProductShot; accent: string }> = ({ shot, accent }) => {
  const { frame, fps, seconds } = useFrameProgress();
  const spread = shot === 'exploded' ? interpolate(frame, [0, 22, 52], [0, 1, 1], { extrapolateRight: 'clamp' }) : 0;
  const yaw = shot === 'macro' ? Math.sin(seconds * 0.5) * 0.12 : seconds * 0.22;
  const handleCurve = useMemo(() => new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.58, 0.78, 0.05),
    new THREE.Vector3(1.25, 0.86, 0.06),
    new THREE.Vector3(1.58, 0.52, 0.06),
    new THREE.Vector3(1.56, -0.42, 0.06),
    new THREE.Vector3(1.23, -0.77, 0.06),
    new THREE.Vector3(0.58, -0.76, 0.05),
  ]), []);
  const glassY = -0.04 - spread * 0.32;
  return (
    <group rotation={[0, yaw, 0]} scale={shot === 'macro' ? 1.08 : 1}>
      <mesh position={[0, -0.01 - spread * 0.42, 0]} castShadow>
        <latheGeometry args={[CARAFE_PROFILE, 72]} />
        <meshPhysicalMaterial color="#E8DDC8" roughness={0.28} metalness={0.04} clearcoat={0.42} />
      </mesh>
      {Array.from({ length: 28 }, (_, index) => {
        const angle = (Math.PI * 2 * index) / 28;
        return (
          <mesh key={index} position={[Math.cos(angle) * 0.735, -0.12 - spread * 0.42, Math.sin(angle) * 0.735]} castShadow>
            <cylinderGeometry args={[0.018, 0.018, 1.9, 8]} />
            <meshStandardMaterial color="#B5A78E" roughness={0.52} />
          </mesh>
        );
      })}
      <mesh position={[0, 1.12 + spread * 0.35, 0]}>
        <cylinderGeometry args={[0.61, 0.61, 0.13, 64]} />
        <meshPhysicalMaterial color="#C49A58" metalness={0.84} roughness={0.2} />
      </mesh>
      <mesh position={[0, 1.29 + spread * 0.52, 0]}>
        <cylinderGeometry args={[0.48, 0.55, 0.28, 48]} />
        <meshPhysicalMaterial color="#D5C8AE" roughness={0.26} />
      </mesh>
      <mesh position={[0, glassY, 0]} scale={[0.78, 0.93, 0.78]}>
        <latheGeometry args={[CARAFE_PROFILE, 48]} />
        <meshPhysicalMaterial color="#B7E2E8" roughness={0.12} metalness={0.02} transparent opacity={0.42} transmission={0.25} />
      </mesh>
      <mesh position={[0, glassY + 1.05, 0]}>
        <torusGeometry args={[0.45, 0.024, 10, 64]} />
        <meshBasicMaterial color={accent} />
      </mesh>
      <mesh position={[0, -0.02, 0.92]} rotation={[Math.PI / 2, 0, 0]}>
        <tubeGeometry args={[handleCurve, 72, 0.105, 16, false]} />
        <meshPhysicalMaterial color="#9B6338" roughness={0.38} clearcoat={0.2} />
      </mesh>
      <mesh position={[0, -1.42 - spread * 0.42, 0]}>
        <cylinderGeometry args={[0.57, 0.58, 0.12, 64]} />
        <meshStandardMaterial color="#C7B99F" roughness={0.5} />
      </mesh>
    </group>
  );
};

const MobileModel: React.FC<{ tablet: boolean; accent: string }> = ({ tablet, accent }) => {
  const { seconds } = useFrameProgress();
  const width = tablet ? 2.05 : 1.22;
  const height = tablet ? 1.38 : 2.45;
  return (
    <group rotation={[0.12 + Math.sin(seconds * 0.35) * 0.04, seconds * 0.2, -0.08]}>
      <mesh castShadow>
        <boxGeometry args={[width, height, 0.11]} />
        <meshPhysicalMaterial color="#202936" metalness={0.72} roughness={0.25} clearcoat={0.9} />
      </mesh>
      <mesh position={[0, 0, 0.062]}>
        <boxGeometry args={[width * 0.94, height * 0.94, 0.012]} />
        <meshPhysicalMaterial color="#101D2E" metalness={0.28} roughness={0.16} clearcoat={1} />
      </mesh>
      <mesh position={[0, 0, 0.071]}>
        <planeGeometry args={[width * 0.84, height * 0.82]} />
        <meshBasicMaterial color="#214A70" />
      </mesh>
      <mesh position={[width * 0.3, height * 0.36, 0.08]}>
        <cylinderGeometry args={[0.07, 0.07, 0.025, 24]} />
        <meshStandardMaterial color={accent} metalness={0.7} />
      </mesh>
    </group>
  );
};

const LaptopModel: React.FC = () => {
  const { seconds } = useFrameProgress();
  const open = 1.12 + Math.sin(seconds * 0.25) * 0.035;
  return (
    <group rotation={[-0.18, seconds * 0.14, 0]}>
      <mesh position={[0, -0.57, 0]} rotation={[-0.08, 0, 0]} castShadow>
        <boxGeometry args={[2.7, 0.1, 1.75]} />
        <meshPhysicalMaterial color="#798594" metalness={0.86} roughness={0.24} />
      </mesh>
      <mesh position={[0, 0.27, -0.77]} rotation={[-open, 0, 0]} castShadow>
        <boxGeometry args={[2.68, 1.72, 0.075]} />
        <meshPhysicalMaterial color="#596778" metalness={0.78} roughness={0.2} />
      </mesh>
      <mesh position={[0, 0.27, -0.72]} rotation={[-open, 0, 0]}>
        <planeGeometry args={[2.48, 1.52]} />
        <meshBasicMaterial color="#18334D" />
      </mesh>
    </group>
  );
};

const HeadphonesModel: React.FC = () => {
  const { seconds } = useFrameProgress();
  const curve = useMemo(() => new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.92, 0.28, 0), new THREE.Vector3(-0.8, 1.0, 0),
    new THREE.Vector3(0, 1.38, 0), new THREE.Vector3(0.8, 1.0, 0),
    new THREE.Vector3(0.92, 0.28, 0),
  ]), []);
  return (
    <group rotation={[0.12, seconds * 0.22, 0]}>
      <mesh><tubeGeometry args={[curve, 64, 0.09, 14, false]} /><meshPhysicalMaterial color="#202936" metalness={0.55} roughness={0.3} /></mesh>
      {[-1, 1].map((side) => (
        <group key={side} position={[side * 0.92, 0.02, 0]}>
          <mesh rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.42, 0.42, 0.25, 48]} /><meshPhysicalMaterial color="#384454" metalness={0.55} roughness={0.26} /></mesh>
          <mesh position={[0, 0, 0.16]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.31, 0.31, 0.08, 48]} /><meshStandardMaterial color="#111A24" roughness={0.84} /></mesh>
        </group>
      ))}
    </group>
  );
};

const WearableModel: React.FC = () => {
  const { seconds } = useFrameProgress();
  return (
    <group rotation={[0.12, seconds * 0.22, -0.08]}>
      <mesh><boxGeometry args={[0.9, 1.16, 0.18]} /><meshPhysicalMaterial color="#A6AFB9" metalness={0.86} roughness={0.2} /></mesh>
      <mesh position={[0, 0, 0.105]}><boxGeometry args={[0.78, 1.02, 0.025]} /><meshBasicMaterial color="#12243C" /></mesh>
      <mesh position={[0, 0.86, 0]}><boxGeometry args={[0.56, 0.78, 0.1]} /><meshPhysicalMaterial color="#293848" roughness={0.54} /></mesh>
      <mesh position={[0, -0.86, 0]}><boxGeometry args={[0.56, 0.78, 0.1]} /><meshPhysicalMaterial color="#293848" roughness={0.54} /></mesh>
    </group>
  );
};

const GltfModel: React.FC<{ url: string }> = ({ url }) => {
  const gltf = useLoader(GLTFLoader, url);
  const object = useMemo(() => {
    const clone = gltf.scene.clone(true);
    const bounds = new THREE.Box3().setFromObject(clone);
    const size = bounds.getSize(new THREE.Vector3());
    const center = bounds.getCenter(new THREE.Vector3());
    const factor = 2.8 / Math.max(size.x, size.y, size.z, 0.001);
    clone.position.sub(center.multiplyScalar(factor));
    clone.scale.multiplyScalar(factor);
    return clone;
  }, [gltf.scene]);
  return <primitive object={object} />;
};

const Pedestal: React.FC<{ accent: string }> = ({ accent }) => (
  <group position={[0, -1.72, 0]}>
    <mesh>
      <cylinderGeometry args={[1.6, 1.85, 0.22, 72]} />
      <meshPhysicalMaterial color="#1B2634" metalness={0.62} roughness={0.32} />
    </mesh>
    <mesh position={[0, 0.12, 0]}>
      <torusGeometry args={[1.55, 0.018, 8, 96]} />
      <meshBasicMaterial color={accent} transparent opacity={0.78} />
    </mesh>
  </group>
);

const ProductScene: React.FC<Props> = ({ profile, shot, cameraMove, accent, modelUrl }) => {
  const { seconds } = useFrameProgress();
  const { width, height } = useVideoConfig();
  const landscapeScale = width > height ? 0.68 : 1;
  const landscapeOffsetX = width > height ? 1.25 : 0;
  return (
    <>
      <color attach="background" args={['#090F18']} />
      <ambientLight intensity={0.72} />
      <directionalLight position={[4, 6, 7]} intensity={2.2} />
      <pointLight position={[-4, 1, 3]} intensity={36} color={accent} />
      <pointLight position={[3, -2, -4]} intensity={18} color="#8AB4FF" />
      <CameraRig move={cameraMove} />
      <group position={[landscapeOffsetX, 0, 0]}>
      <group position={[0, 0.05 + Math.sin(seconds * 1.4) * 0.025, 0]} scale={landscapeScale}>
        {modelUrl ? (
          <Suspense fallback={null}><GltfModel url={modelUrl} /></Suspense>
        ) : profile === 'thermal-carafe' ? (
          <CarafeModel shot={shot} accent={accent} />
        ) : profile === 'smartphone' ? (
          <MobileModel tablet={false} accent={accent} />
        ) : profile === 'tablet' ? (
          <MobileModel tablet accent={accent} />
        ) : profile === 'laptop' ? (
          <LaptopModel />
        ) : profile === 'headphones' ? (
          <HeadphonesModel />
        ) : (
          <WearableModel />
        )}
      </group>
      <Pedestal accent={accent} />
      <mesh position={[0, -1.88, -0.5]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[4.5, 72]} />
        <meshBasicMaterial color="#142235" transparent opacity={0.3} />
      </mesh>
      </group>
    </>
  );
};

export const SceneProductStage3D: React.FC<Props> = (props) => {
  const profileResolved = props.profile !== 'unresolved';
  const { width, height } = useVideoConfig();
  return (
    <AbsoluteFill style={{ overflow: 'hidden', background: 'radial-gradient(ellipse at 50% 42%,#25394D 0%,#0D1420 58%,#080C14 100%)' }}>
      <ThreeCanvas
        width={width}
        height={height}
        camera={{ position: [0, 0.1, 6.8], fov: width > height ? 38 : 48 }}
        gl={{ alpha: false, antialias: true, preserveDrawingBuffer: true }}
      >
        <ProductScene {...props} />
      </ThreeCanvas>
      {!props.modelUrl ? (
        <div style={{
          position: 'absolute', left: 38, bottom: 24, padding: '7px 12px',
          color: '#D8E0EA', background: '#07111CCB', border: '1px solid #FFFFFF22',
          borderRadius: 8, fontSize: 12, fontWeight: 800, letterSpacing: 1.2,
        }}>
          {profileResolved ? 'MODELO 3D PARAMÉTRICO ILUSTRATIVO' : 'ESTÁGIO 3D'}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};

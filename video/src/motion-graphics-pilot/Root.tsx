import React, { useMemo } from 'react';
import * as THREE from 'three';
import {
  AbsoluteFill,
  Audio,
  Composition,
  interpolate,
  registerRoot,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { ThreeCanvas } from '@remotion/three';

const FPS = 30;
const DURATION = 900;

type CopyScene = {
  start: number;
  end: number;
  eyebrow: string;
  title: string;
  detail: string;
};

const COPY_SCENES: CopyScene[] = [
  {
    start: 0,
    end: 96,
    eyebrow: 'REDMI PAD 2 PRO  ·  REVIEW 3D',
    title: 'TELA GRANDE.\nPOSSIBILIDADES MAIORES.',
    detail: 'UM TABLET PARA ESTUDO, TRABALHO E ENTRETENIMENTO',
  },
  {
    start: 96,
    end: 255,
    eyebrow: 'EXPERIÊNCIA VISUAL',
    title: '12,1”  ·  2.5K',
    detail: 'ATÉ 120 Hz EM APLICATIVOS COMPATÍVEIS',
  },
  {
    start: 255,
    end: 420,
    eyebrow: 'DESEMPENHO',
    title: 'SNAPDRAGON\n7s GEN 4',
    detail: 'PLATAFORMA MÓVEL COM PROCESSO DE 4 nm',
  },
  {
    start: 420,
    end: 585,
    eyebrow: 'AUTONOMIA',
    title: '12.000 mAh',
    detail: 'CAPACIDADE TÍPICA DECLARADA PELA XIAOMI',
  },
  {
    start: 585,
    end: 720,
    eyebrow: 'PONTO DE ATENÇÃO',
    title: 'LCD. NÃO AMOLED.',
    detail: 'UM DETALHE IMPORTANTE ANTES DE ESCOLHER',
  },
  {
    start: 720,
    end: DURATION,
    eyebrow: 'VEREDITO VETOR',
    title: 'ESTUDO. TRABALHO.\nSTREAMING.',
    detail: 'COMPARE A VERSÃO 6 GB + 128 GB E O PREÇO ATUAL',
  },
];

function roundedRectangle(width: number, height: number, radius: number): THREE.Shape {
  const x = -width / 2;
  const y = -height / 2;
  const shape = new THREE.Shape();
  shape.moveTo(x + radius, y);
  shape.lineTo(x + width - radius, y);
  shape.quadraticCurveTo(x + width, y, x + width, y + radius);
  shape.lineTo(x + width, y + height - radius);
  shape.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  shape.lineTo(x + radius, y + height);
  shape.quadraticCurveTo(x, y + height, x, y + height - radius);
  shape.lineTo(x, y + radius);
  shape.quadraticCurveTo(x, y, x + radius, y);
  return shape;
}

const TabletScreen = () => {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 760;
    const context = canvas.getContext('2d');
    if (!context) return new THREE.CanvasTexture(canvas);

    const gradient = context.createLinearGradient(0, 0, 1200, 760);
    gradient.addColorStop(0, '#07152d');
    gradient.addColorStop(0.52, '#123a82');
    gradient.addColorStop(1, '#07101f');
    context.fillStyle = gradient;
    context.fillRect(0, 0, 1200, 760);

    const glow = context.createRadialGradient(800, 280, 20, 800, 280, 520);
    glow.addColorStop(0, 'rgba(80,155,255,0.55)');
    glow.addColorStop(1, 'rgba(20,40,100,0)');
    context.fillStyle = glow;
    context.fillRect(0, 0, 1200, 760);

    context.strokeStyle = 'rgba(180,215,255,0.22)';
    context.lineWidth = 3;
    for (let i = 0; i < 8; i += 1) {
      context.beginPath();
      context.moveTo(0, 520 + i * 30);
      context.bezierCurveTo(320, 430 + i * 22, 760, 710 - i * 16, 1200, 430 + i * 24);
      context.stroke();
    }

    context.fillStyle = '#cfe4ff';
    context.font = '600 31px Arial';
    context.fillText('REDMI PAD 2 PRO', 76, 104);
    context.fillStyle = '#ffffff';
    context.font = '700 104px Arial';
    context.fillText('2.5K', 76, 300);
    context.font = '700 58px Arial';
    context.fillText('120 Hz', 78, 390);
    context.fillStyle = 'rgba(220,236,255,0.78)';
    context.font = '400 27px Arial';
    context.fillText('MORE ROOM FOR WHAT MATTERS', 80, 455);

    context.fillStyle = 'rgba(255,255,255,0.12)';
    context.beginPath();
    context.roundRect(78, 565, 1040, 108, 26);
    context.fill();
    context.fillStyle = '#ffffff';
    context.font = '600 31px Arial';
    context.fillText('12.1”  DISPLAY     •     SNAPDRAGON 7s GEN 4', 112, 632);

    const map = new THREE.CanvasTexture(canvas);
    map.colorSpace = THREE.SRGBColorSpace;
    map.anisotropy = 8;
    return map;
  }, []);

  const screenGeometry = useMemo(
    () => new THREE.ShapeGeometry(roundedRectangle(3.48, 2.17, 0.12)),
    [],
  );

  return (
    <mesh geometry={screenGeometry} position={[0, 0, 0.155]}>
      <meshBasicMaterial map={texture} toneMapped={false} />
    </mesh>
  );
};

const TabletModel = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const seconds = frame / fps;
  const entrance = interpolate(frame, [0, 54, 110], [0.76, 1.04, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const rise = interpolate(frame, [0, 70], [-0.52, 0.08], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const yaw = interpolate(frame, [0, 110, 255, 420, 585, 720, 900], [0.48, 0.08, -0.13, 0.12, -0.08, 0.1, 0.02]);
  const shape = useMemo(() => roundedRectangle(3.72, 2.38, 0.18), []);
  const bodyGeometry = useMemo(
    () => new THREE.ExtrudeGeometry(shape, {
      depth: 0.105,
      bevelEnabled: true,
      bevelSegments: 4,
      steps: 1,
      bevelSize: 0.025,
      bevelThickness: 0.025,
      curveSegments: 12,
    }),
    [shape],
  );

  return (
    <group position={[0, rise + Math.sin(seconds * 0.9) * 0.035, 0]} scale={entrance}>
      <group rotation={[0.16 + Math.sin(seconds * 0.5) * 0.025, yaw, -0.035]}>
        <mesh geometry={bodyGeometry}>
          <meshStandardMaterial color="#303846" metalness={0.92} roughness={0.24} />
        </mesh>

        <mesh position={[0, 0, 0.108]}>
          <shapeGeometry args={[roundedRectangle(3.57, 2.28, 0.15)]} />
          <meshStandardMaterial color="#05080e" metalness={0.45} roughness={0.28} />
        </mesh>

        <TabletScreen />

        <mesh position={[-1.69, 1.04, 0.162]}>
          <circleGeometry args={[0.035, 32]} />
          <meshBasicMaterial color="#07101d" />
        </mesh>

        <mesh position={[0.0, -1.205, 0.055]}>
          <boxGeometry args={[0.68, 0.025, 0.035]} />
          <meshStandardMaterial color="#687487" metalness={0.9} roughness={0.28} />
        </mesh>

        <mesh position={[1.895, 0.58, 0.055]}>
          <boxGeometry args={[0.035, 0.27, 0.045]} />
          <meshStandardMaterial color="#8fa2bc" metalness={0.85} roughness={0.25} />
        </mesh>
      </group>
    </group>
  );
};

const OrbitElements = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const seconds = frame / fps;
  const particles = useMemo(
    () => Array.from({ length: 34 }, (_, index) => {
      const angle = index * 2.399963;
      const radius = 2.15 + (index % 6) * 0.28;
      return {
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius * 1.18,
        z: -0.7 - (index % 4) * 0.32,
        size: 0.012 + (index % 4) * 0.008,
      };
    }),
    [],
  );

  return (
    <>
      <mesh rotation={[0.96, 0.15, seconds * 0.16]} position={[0, 0, -0.5]}>
        <torusGeometry args={[2.42, 0.012, 8, 180]} />
        <meshBasicMaterial color="#438dff" transparent opacity={0.55} />
      </mesh>
      <mesh rotation={[1.12, -0.42, -seconds * 0.12]} position={[0, 0, -0.65]}>
        <torusGeometry args={[2.65, 0.008, 8, 180]} />
        <meshBasicMaterial color="#c8ddff" transparent opacity={0.3} />
      </mesh>
      {particles.map((particle, index) => (
        <mesh
          key={index}
          position={[
            particle.x,
            particle.y + Math.sin(seconds * 0.8 + index) * 0.035,
            particle.z,
          ]}
        >
          <sphereGeometry args={[particle.size, 10, 10]} />
          <meshBasicMaterial color={index % 3 === 0 ? '#9ec9ff' : '#ffffff'} transparent opacity={0.72} />
        </mesh>
      ))}
    </>
  );
};

const ThreeProductStage = () => {
  const { width, height } = useVideoConfig();
  return (
    <ThreeCanvas
      width={width}
      height={height}
      style={{ position: 'absolute', inset: 0 }}
      camera={{ position: [0, 0, 8.25], fov: 42 }}
      gl={{ alpha: true, antialias: true, preserveDrawingBuffer: true }}
    >
      <ambientLight intensity={0.8} />
      <directionalLight position={[4, 5, 7]} intensity={2.2} />
      <directionalLight position={[-5, -2, 3]} intensity={1.1} color="#4285F4" />
      <pointLight position={[0, 2.7, 3.5]} intensity={24} color="#397fff" />
      <OrbitElements />
      <TabletModel />
    </ThreeCanvas>
  );
};

const AnimatedCopy = ({ scene }: { scene: CopyScene }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(
    frame,
    [scene.start, scene.start + 13, scene.end - 14, scene.end],
    [0, 1, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  );
  const rise = interpolate(frame, [scene.start, scene.start + 18], [34, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <div
      style={{
        position: 'absolute',
        top: 278,
        left: 58,
        right: 58,
        opacity,
        transform: `translateY(${rise}px)`,
        textAlign: 'center',
      }}
    >
      <div style={{
        color: '#8dbdff',
        fontFamily: 'Arial, sans-serif',
        fontSize: 23,
        fontWeight: 700,
        letterSpacing: 5,
        marginBottom: 23,
      }}>{scene.eyebrow}</div>
      <div style={{
        color: '#ffffff',
        fontFamily: 'Arial, sans-serif',
        fontSize: 68,
        lineHeight: 1.02,
        fontWeight: 900,
        letterSpacing: -2.5,
        whiteSpace: 'pre-line',
        textShadow: '0 5px 32px rgba(0,0,0,0.38)',
      }}>{scene.title}</div>
      <div style={{
        color: 'rgba(226,237,255,0.86)',
        fontFamily: 'Arial, sans-serif',
        fontSize: 24,
        lineHeight: 1.35,
        fontWeight: 600,
        letterSpacing: 1.2,
        marginTop: 23,
      }}>{scene.detail}</div>
    </div>
  );
};

const PilotOverlays = () => {
  const frame = useCurrentFrame();
  const brandOpacity = interpolate(frame, [0, 20, 850, 900], [0, 1, 1, 0.82], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const footerOpacity = interpolate(frame, [0, 18, 80, 900], [0, 1, 1, 0.85], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <>
      <div style={{
        position: 'absolute',
        top: 88,
        left: 64,
        right: 64,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        color: 'rgba(220,235,255,0.76)',
        fontFamily: 'Arial, sans-serif',
        fontWeight: 700,
        fontSize: 19,
        letterSpacing: 3,
        opacity: brandOpacity,
      }}>
        <span>VETOR LAB</span>
        <span>TECH REVIEW  /  3D</span>
      </div>

      {COPY_SCENES.map((scene) => (
        <AnimatedCopy key={scene.start} scene={scene} />
      ))}

      <div style={{
        position: 'absolute',
        bottom: 114,
        left: 70,
        right: 70,
        display: 'flex',
        justifyContent: 'center',
        opacity: footerOpacity,
      }}>
        <div style={{
          border: '1px solid rgba(133,182,255,0.42)',
          borderRadius: 999,
          background: 'rgba(8,18,38,0.78)',
          padding: '17px 34px',
          color: '#dceaff',
          fontFamily: 'Arial, sans-serif',
          fontSize: 20,
          fontWeight: 800,
          letterSpacing: 3,
        }}>VETOR.BLOG  ·  TECNOLOGIA SEM COMPLICAÇÃO</div>
      </div>
    </>
  );
};

export const RedmiPad2ProMotionPilot = () => {
  return (
    <AbsoluteFill style={{
      background: 'radial-gradient(ellipse at 50% 49%, rgba(27,69,145,0.5) 0%, rgba(7,17,37,0.35) 34%, transparent 66%), linear-gradient(180deg, #050912 0%, #09152b 52%, #050912 100%)',
      overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: 'linear-gradient(rgba(132,177,255,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(132,177,255,0.035) 1px, transparent 1px)',
        backgroundSize: '74px 74px',
        opacity: 0.4,
      }} />
      <ThreeProductStage />
      <PilotOverlays />
      <Audio src={staticFile('pilot/redmi-pad-2-pro-voice.mp3')} volume={1} />
    </AbsoluteFill>
  );
};

const PilotRoot = () => (
  <>
    <Composition
      id="RedmiPad2ProMotionPilot"
      component={RedmiPad2ProMotionPilot}
      durationInFrames={DURATION}
      fps={FPS}
      width={1080}
      height={1920}
    />
  </>
);

registerRoot(PilotRoot);

import {
  AbsoluteFill,
  Sequence,
  interpolate,
  useCurrentFrame,
  Img,
  Loop,
  OffthreadVideo,
  Audio,
  useVideoConfig,
  spring,
} from 'remotion';
import { theme } from '../styles/theme';
import { fonts } from '../styles/fonts';
import { GradientBackground } from '../components/GradientBackground';
import { AnimatedText } from '../components/AnimatedText';
import { ProductCard } from '../components/ProductCard';
import { ScoreBar } from '../components/ScoreBar';
import { KineticCaption } from '../components/KineticCaption';

export interface SubtitleEntry {
  start: number;
  end: number;
  text: string;
}

export interface ComparisonSceneData {
  id: number;
  text: string;
  duration: number;
  visualCue: string;
  brollKeywords: string[];
  startFrame: number;
  endFrame: number;
  type: 'intro' | 'product1' | 'product2' | 'comparison' | 'verdict';
}

interface ComparisonVideoProps {
  title: string;
  product1: { name: string; imageUrl: string; score: number };
  product2: { name: string; imageUrl: string; score: number };
  categories: Array<{ label: string; score1: number; score2: number }>;
  winner: 0 | 1 | 2;
  comparisonUrl?: string;
  hook: string;
  scenes: ComparisonSceneData[];
  callToAction: string;
  audioUrl: string;
  subtitleEntries: SubtitleEntry[];
  productImages?: string[];
  brollVideos?: string[];
  totalDuration: number;
  fps: number;
}

const HookScene: React.FC<{ hook: string; product1Image: string; product2Image: string }> = ({ hook, product1Image, product2Image }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const hookFrames = 3 * fps;
  const progress = frame / hookFrames;

  const vsScale = interpolate(progress, [0.2, 0.5], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const textOpacity = interpolate(progress, [0, 0.15, 0.85, 1], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const imgOpacity = interpolate(progress, [0, 0.3, 0.9, 1], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <GradientBackground>
      <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 30 }}>
        <div style={{ display: 'flex', gap: 60, opacity: imgOpacity, transform: `scale(${interpolate(progress, [0, 0.2], [0.7, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })})` }}>
          <div style={{ background: theme.surface, borderRadius: 24, padding: 30, border: `2px solid ${theme.blue}` }}>
            <Img src={product1Image} style={{ width: 280, height: 280, objectFit: 'contain', borderRadius: 16 }} />
          </div>
          <div style={{ transform: `scale(${vsScale})`, fontSize: 60, fontWeight: 'bold', color: theme.blue, fontFamily: fonts.heading, display: 'flex', alignItems: 'center', textShadow: `0 0 40px ${theme.blue}60` }}>
            VS
          </div>
          <div style={{ background: theme.surface, borderRadius: 24, padding: 30, border: `2px solid ${theme.green}` }}>
            <Img src={product2Image} style={{ width: 280, height: 280, objectFit: 'contain', borderRadius: 16 }} />
          </div>
        </div>
        <AnimatedText text={hook} fontSize={48} color={theme.text} delay={0} maxWidth={900} style={{ opacity: textOpacity, textShadow: `0 4px 20px ${theme.bg}` }} />
      </div>
    </GradientBackground>
  );
};

const ProductScene: React.FC<{
  product: { name: string; imageUrl: string; score: number };
  borderColor: string;
  scoreColor: string;
  label: string;
  currentFrame: number;
  startFrame: number;
  duration: number;
  fps: number;
  brollVideos: string[];
  sceneIndex: number;
}> = ({ product, borderColor, scoreColor, label, currentFrame, startFrame, duration, fps, brollVideos, sceneIndex }) => {
  const frameInScene = currentFrame - startFrame;
  const progress = frameInScene / (duration * fps);
  const hasScore = Number.isFinite(product.score) && product.score > 0;
  const displayedScoreColor = hasScore ? scoreColor : theme.muted;

  const useBroll = brollVideos.length > 0 && progress > 0.3 && progress < 0.9;
  const brollIndex = brollVideos.length > 0 ? sceneIndex % brollVideos.length : 0;

  const productOpacity = useBroll
    ? interpolate(progress, [0.2, 0.4, 0.8, 1], [1, 0.3, 0.3, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
    : 1;

  const brollOpacity = useBroll
    ? interpolate(progress, [0.2, 0.4, 0.8, 1], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
    : 0;

  const slideIn = interpolate(progress, [0, 0.2], [-150, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const textProgress = spring({ fps, frame: frameInScene, config: { stiffness: 120, damping: 20 } });
  const textOpacity = interpolate(textProgress, [0, 0.1, 0.9, 1], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <GradientBackground>
      <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 30 }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 0 }}>
            {useBroll && brollVideos.length > 0 && (
              <Loop durationInFrames={Math.max(1, Math.round(3 * fps))}>
                <OffthreadVideo
                  src={brollVideos[brollIndex]}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: brollOpacity, filter: 'brightness(0.35) blur(1px)' }}
                  muted
                />
              </Loop>
            )}
          </div>

        <div style={{ opacity: productOpacity, transform: `translateX(${slideIn}px)`, zIndex: 1, background: theme.surface, borderRadius: 32, padding: 48, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 32, border: `2px solid ${borderColor}`, boxShadow: `0 20px 60px rgba(0,0,0,0.4)` }}>
          <AnimatedText text={label} fontSize={32} color={theme.muted} />
          <Img src={product.imageUrl} style={{ width: 350, height: 350, objectFit: 'contain', borderRadius: 24 }} />
          <div style={{ fontSize: 36, fontWeight: 'bold', color: theme.text, fontFamily: fonts.heading }}>{product.name}</div>
          <div style={{ width: 180, height: 180, borderRadius: '50%', border: `5px solid ${displayedScoreColor}`, display: 'flex', alignItems: 'center', justifyContent: 'center', background: theme.surface2, boxShadow: `0 0 40px ${displayedScoreColor}40` }}>
            <span style={{ fontSize: 72, fontWeight: 'bold', color: displayedScoreColor, fontFamily: fonts.mono }}>{hasScore ? product.score.toFixed(1) : '—'}</span>
          </div>
        </div>
      </div>
    </GradientBackground>
  );
};

const ComparisonScene: React.FC<{
  product1Name: string;
  product2Name: string;
  categories: Array<{ label: string; score1: number; score2: number }>;
  currentFrame: number;
  startFrame: number;
  duration: number;
  fps: number;
}> = ({ product1Name, product2Name, categories, currentFrame, startFrame, duration, fps }) => {
  const frameInScene = currentFrame - startFrame;
  const progress = frameInScene / (duration * fps);

  return (
    <GradientBackground>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20, width: '100%', padding: '0 40px', height: '100%' }}>
        <AnimatedText text="Comparação Direta" fontSize={40} />
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', maxWidth: 900, marginBottom: 20 }}>
          <span style={{ fontSize: 28, fontWeight: 'bold', color: theme.blue, fontFamily: fonts.heading }}>{product1Name}</span>
          <span style={{ fontSize: 28, fontWeight: 'bold', color: theme.green, fontFamily: fonts.heading }}>{product2Name}</span>
        </div>
        {categories.length === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 22, width: '100%', maxWidth: 900 }}>
            {['Recursos documentados', 'Compatibilidade com seu uso', 'Preço total e condições', 'Garantia e política de devolução'].map((criterion) => (
              <div key={criterion} style={{ width: '100%', padding: '20px 26px', borderRadius: 18, background: theme.surface, border: '1px solid rgba(255,255,255,0.15)', color: theme.text, fontSize: 28, fontFamily: fonts.body, textAlign: 'center' }}>
                {criterion}
              </div>
            ))}
          </div>
        )}
        {categories.map((cat, index) => {
          const barProgress = Math.max(0, Math.min(1, (progress - index * 0.15) / 0.15));
          return (
            <div key={cat.label} style={{ width: '100%', maxWidth: 900, display: 'flex', flexDirection: 'column', gap: 10, opacity: barProgress }}>
              <div style={{ fontSize: 22, color: theme.muted, fontFamily: fonts.body, textAlign: 'center' }}>{cat.label}</div>
              <div style={{ display: 'flex', gap: 24 }}>
                <div style={{ flex: 1 }}>
                  <ScoreBar label="" score={cat.score1} delay={0} color={theme.blue} />
                </div>
                <div style={{ flex: 1 }}>
                  <ScoreBar label="" score={cat.score2} delay={0} color={theme.green} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </GradientBackground>
  );
};

const VerdictScene: React.FC<{
  winnerName: string;
  winnerScore: number;
  loserName: string;
  hasWinner: boolean;
  callToAction: string;
  title: string;
  shortenedUrl: string;
  currentFrame: number;
  startFrame: number;
  duration: number;
  fps: number;
}> = ({ winnerName, winnerScore, loserName, hasWinner, callToAction, title, shortenedUrl, currentFrame, startFrame, duration, fps }) => {
  const frameInScene = currentFrame - startFrame;
  const progress = frameInScene / (duration * fps);
  const crownScale = interpolate(progress, [0.2, 0.4], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const ctaOpacity = interpolate(progress, [0.25, 0.45], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const urlOpacity = interpolate(progress, [0.45, 0.7], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <GradientBackground>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 30, height: '100%', padding: '0 42px' }}>
        <AnimatedText text={hasWinner ? 'VENCEDOR PELOS CRITÉRIOS ANALISADOS' : 'COMO ESCOLHER'} fontSize={38} color={hasWinner ? theme.green : theme.blue} />
        {hasWinner && <div style={{ transform: 'scale(' + crownScale + ')', fontSize: 90 }}>👑</div>}
        <AnimatedText
          text={hasWinner ? winnerName : 'Não há dados suficientes para declarar um vencedor'}
          fontSize={hasWinner ? 48 : 38}
          color={theme.text}
          maxWidth={920}
        />
        {hasWinner && (
          <div style={{ background: theme.surface, borderRadius: 24, padding: '28px 56px', border: '2px solid ' + theme.green, boxShadow: '0 0 40px rgba(0,0,0,0.25)' }}>
            <span style={{ fontSize: 40, fontWeight: 'bold', color: theme.green, fontFamily: fonts.mono }}>{winnerScore.toFixed(1)}</span>
          </div>
        )}
        <AnimatedText
          text={hasWinner ? 'vs ' + loserName : 'Compare ficha oficial, compatibilidade, preço total e garantia dos dois modelos.'}
          fontSize={30}
          color={theme.muted}
          fontWeight="normal"
          maxWidth={900}
        />
        <div style={{ opacity: ctaOpacity, marginTop: 20, background: theme.blue, borderRadius: 20, padding: '24px 46px', boxShadow: '0 10px 40px rgba(37,99,235,0.3)' }}>
          <span style={{ fontSize: 30, fontWeight: 'bold', color: theme.text, fontFamily: fonts.heading }}>{callToAction}</span>
        </div>
        <AnimatedText text={shortenedUrl} fontSize={24} color={theme.green} delay={20} style={{ opacity: urlOpacity, fontFamily: fonts.mono, background: theme.surface, padding: '12px 24px', borderRadius: 12, border: '1px solid rgba(34,197,94,0.25)' }} />
        <AnimatedText text={title} fontSize={22} color={theme.muted} delay={28} style={{ opacity: urlOpacity }} />
      </div>
    </GradientBackground>
  );
};
const SubtitleOverlay: React.FC<{ subtitles: SubtitleEntry[]; currentFrame: number; fps: number }> = ({ subtitles, currentFrame, fps }) => {
  const currentTime = currentFrame / fps;
  const activeSubtitle = subtitles.find(s => currentTime >= s.start && currentTime < s.end);

  if (!activeSubtitle || activeSubtitle.end <= activeSubtitle.start) return null;

  const progress = (currentTime - activeSubtitle.start) / (activeSubtitle.end - activeSubtitle.start);
  const opacity = interpolate(progress, [0, 0.1, 0.9, 1], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return <KineticCaption text={activeSubtitle.text} progress={progress} opacity={opacity} />;
};
export const ComparisonVideo: React.FC<ComparisonVideoProps> = ({
  title,
  product1,
  product2,
  categories,
  winner,
  comparisonUrl,
  hook,
  scenes,
  callToAction,
  audioUrl,
  subtitleEntries,
  productImages = [],
  brollVideos = [],
  totalDuration,
  fps,
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  const hasWinner = winner === 1 || winner === 2;
  const winnerProduct = winner === 2 ? product2 : product1;
  const loserProduct = winner === 1 ? product2 : product1;
  const shortenedUrl = typeof comparisonUrl === 'string' && comparisonUrl.startsWith('https://www.vetor.blog/comparativos/')
    ? comparisonUrl.replace('https://www.vetor.blog', 'vetor.blog')
    : 'vetor.blog/comparativos/';

  const hookFrames = 3 * fps;
  const verdictFrames = 5 * fps;
  const contentFrames = durationInFrames - hookFrames - verdictFrames;

  return (
    <AbsoluteFill style={{ background: theme.bg, overflow: 'hidden' }}>
      <Audio src={audioUrl} />

      <Sequence from={0} durationInFrames={hookFrames}>
        <HookScene hook={hook} product1Image={product1.imageUrl} product2Image={product2.imageUrl} />
      </Sequence>

      {scenes.map((scene) => (
        <Sequence key={scene.id} from={scene.startFrame} durationInFrames={scene.endFrame - scene.startFrame}>
          {scene.type === 'product1' && (
            <ProductScene
              product={product1}
              borderColor={theme.blue}
              scoreColor={theme.blue}
              label="Produto 1"
              currentFrame={frame}
              startFrame={scene.startFrame}
              duration={scene.duration}
              fps={fps}
              brollVideos={brollVideos}
              sceneIndex={scene.id}
            />
          )}
          {scene.type === 'product2' && (
            <ProductScene
              product={product2}
              borderColor={theme.green}
              scoreColor={theme.green}
              label="Produto 2"
              currentFrame={frame}
              startFrame={scene.startFrame}
              duration={scene.duration}
              fps={fps}
              brollVideos={brollVideos}
              sceneIndex={scene.id}
            />
          )}
          {scene.type === 'comparison' && (
            <ComparisonScene
              product1Name={product1.name}
              product2Name={product2.name}
              categories={categories}
              currentFrame={frame}
              startFrame={scene.startFrame}
              duration={scene.duration}
              fps={fps}
            />
          )}
        </Sequence>
      ))}

      <Sequence from={hookFrames + contentFrames} durationInFrames={verdictFrames}>
        <VerdictScene
          winnerName={winnerProduct.name}
          winnerScore={winnerProduct.score}
          loserName={loserProduct.name}
          hasWinner={hasWinner}
          callToAction={callToAction}
          title={title}
          shortenedUrl={shortenedUrl}
          currentFrame={frame}
          startFrame={hookFrames + contentFrames}
          duration={verdictFrames}
          fps={fps}
        />
      </Sequence>

      <SubtitleOverlay subtitles={subtitleEntries} currentFrame={frame} fps={fps} />
    </AbsoluteFill>
  );
};
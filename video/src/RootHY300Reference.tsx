import {Composition, registerRoot} from 'remotion';
import {HY300ReferenceShort, type HY300ReferenceShortProps} from './compositions/HY300ReferenceShort';
import './styles/loadFonts';
import './styles/global.css';

const defaults: HY300ReferenceShortProps = {
  title: 'Mini projetor HY300: a promessa de 4K tem um detalhe',
  imageUrl: 'hy300-reference/projector-main.webp',
  voiceUrl: 'hy300-reference/voiceover.mp3',
  musicUrl: 'hy300-reference/music.wav',
  effectsUrl: 'hy300-reference/effects.wav',
  scenes: [],
  totalDurationFrames: 900,
  fps: 24,
};

const RemotionRoot = () => (
  <Composition
    id="HY300ReferenceShort"
    component={HY300ReferenceShort}
    durationInFrames={defaults.totalDurationFrames}
    fps={24}
    width={1080}
    height={1920}
    defaultProps={defaults}
    calculateMetadata={({props}) => ({durationInFrames: Math.max(1, props.totalDurationFrames)})}
  />
);

registerRoot(RemotionRoot);

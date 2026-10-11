import { Composition, registerRoot } from 'remotion';
import { ReviewVideo } from './compositions/ReviewVideo';
import { ComparisonVideo } from './compositions/ComparisonVideo';

// Import Google Fonts via CSS
import './styles/global.css';

const ReviewVideoAny = ReviewVideo as any;
const ComparisonVideoAny = ComparisonVideo as any;

export const RemotionRoot = () => {
  return (
    <>
      <Composition
        id="ReviewVideo"
        component={ReviewVideoAny}
        durationInFrames={3600}
        calculateMetadata={({ props }: any) => ({ durationInFrames: Math.max(1, Math.ceil(Number(props.totalDuration || 120) * 30)) })}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{
          title: 'Samsung Galaxy S24 Ultra',
          imageUrl: 'https://http2.mlstatic.com/D_NQ_NP_galaxy-s24.webp',
          score: 0,
          category: 'Smartphones',
          hook: 'Pare! Antes de comprar o Galaxy S24 Ultra, veja isso!',
          scenes: [
            { id: 1, text: 'Chegou o Samsung Galaxy S24 Ultra, será que vale o investimento?', duration: 5, visualCue: 'Produto em destaque', brollKeywords: ['product reveal'], startFrame: 90, endFrame: 240 },
            { id: 2, text: 'Confira preço, condições e a ficha técnica do modelo exato antes de comprar.', duration: 7, visualCue: 'Preço na tela', brollKeywords: ['price tag'], startFrame: 240, endFrame: 450 },
            { id: 3, text: 'Design premium, construção sólida. Na mão passa confiança.', duration: 8, visualCue: 'Close nos detalhes', brollKeywords: ['premium design'], startFrame: 450, endFrame: 690 },
            { id: 4, text: 'Compare os recursos documentados com as tarefas que você pretende realizar.', duration: 8, visualCue: 'Apps e jogos rodando', brollKeywords: ['performance test'], startFrame: 690, endFrame: 930 },
            { id: 5, text: 'Confirme autonomia e carregamento na ficha técnica oficial da versão exata.', duration: 7, visualCue: 'Ícone de bateria', brollKeywords: ['battery life'], startFrame: 930, endFrame: 1140 },
            { id: 6, text: 'Confira o preço total e confirme o conteúdo da embalagem no anúncio.', duration: 7, visualCue: 'Lista de contras', brollKeywords: ['cons list'], startFrame: 1140, endFrame: 1350 },
            { id: 7, text: 'Veredito: decida com base nos recursos documentados e nas suas necessidades.', duration: 8, visualCue: 'Nota final', brollKeywords: ['verdict'], startFrame: 1350, endFrame: 1590 },
          ],
          callToAction: 'Confira preço e condições atuais no link da descrição.',
          audioUrl: '/audio/sample.mp3',
          subtitleEntries: [
            { start: 0, end: 3, text: 'Pare! Antes de comprar o Galaxy S24 Ultra, veja isso!' },
            { start: 3, end: 8, text: 'Chegou o Samsung Galaxy S24 Ultra, será que vale o investimento?' },
            { start: 8, end: 15, text: 'Confira preço, condições e a ficha técnica do modelo exato antes de comprar.' },
            { start: 15, end: 23, text: 'Design premium, construção sólida. Na mão passa confiança.' },
            { start: 23, end: 31, text: 'Compare os recursos documentados com as tarefas que você pretende realizar.' },
            { start: 31, end: 38, text: 'Confirme autonomia e carregamento na ficha técnica oficial da versão exata.' },
            { start: 38, end: 45, text: 'Confira o preço total e confirme o conteúdo da embalagem no anúncio.' },
            { start: 45, end: 53, text: 'Veredito: decida com base nos recursos documentados e nas suas necessidades.' },
            { start: 53, end: 56, text: 'Confira preço e condições atuais no link da descrição.' },
          ],
          productImages: ['https://http2.mlstatic.com/D_NQ_NP_galaxy-s24.webp'],
          brollVideos: [],
          totalDuration: 120,
          fps: 30,
        }}
      />
      <Composition
        id="ComparisonVideo"
        component={ComparisonVideoAny}
        durationInFrames={3600}
        calculateMetadata={({ props }: any) => ({ durationInFrames: Math.max(1, Math.ceil(Number(props.totalDuration || 120) * 30)) })}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{
          title: 'Galaxy S24 vs iPhone 15: Qual Comprar?',
          comparisonUrl: 'https://www.vetor.blog/comparativos/',
          product1: { name: 'Galaxy S24', imageUrl: 'https://http2.mlstatic.com/D_NQ_NP_galaxy-s24.webp', score: 0 },
          product2: { name: 'iPhone 15', imageUrl: 'https://http2.mlstatic.com/D_NQ_NP_iphone-15.webp', score: 0 },
          categories: [],
          winner: 0,
          hook: 'Galaxy S24 vs iPhone 15 - qual comprar em 2026?',
          scenes: [
            { id: 1, text: 'Galaxy S24 vs iPhone 15 - qual comprar em 2026?', duration: 4, visualCue: 'Dois produtos lado a lado', brollKeywords: ['smartphone comparison'], startFrame: 90, endFrame: 210, type: 'intro' },
            { id: 2, text: 'Confira na ficha oficial os recursos de tela, câmera e acessórios de cada modelo.', duration: 8, visualCue: 'Galaxy S24 em close', brollKeywords: ['samsung galaxy'], startFrame: 210, endFrame: 450, type: 'product1' },
            { id: 3, text: 'Compare a compatibilidade e os recursos listados pelo fabricante para cada modelo.', duration: 8, visualCue: 'iPhone 15 em uso', brollKeywords: ['iphone'], startFrame: 450, endFrame: 690, type: 'product2' },
            { id: 4, text: '', duration: 10, visualCue: 'Barras comparativas', brollKeywords: ['comparison chart'], startFrame: 690, endFrame: 990, type: 'comparison' },
            { id: 5, text: '', duration: 5, visualCue: 'Cartela final com critérios de escolha', brollKeywords: ['comparison verdict'], startFrame: 990, endFrame: 1140, type: 'verdict' },
          ],
          callToAction: 'Confira a análise completa!',
          audioUrl: '/audio/sample.mp3',
          subtitleEntries: [
            { start: 0, end: 3, text: 'Galaxy S24 vs iPhone 15 - qual comprar em 2026?' },
            { start: 3, end: 11, text: 'Confira na ficha oficial os recursos de tela, câmera e acessórios de cada modelo.' },
            { start: 11, end: 19, text: 'Compare a compatibilidade e os recursos listados pelo fabricante para cada modelo.' },
            { start: 19, end: 29, text: 'Comparando design, câmera, desempenho, bateria e custo-benefício.' },
            { start: 29, end: 34, text: 'A escolha depende dos critérios documentados e do seu perfil de uso.' },
            { start: 34, end: 37, text: 'Confira preço e condições atuais no link da descrição.' },
          ],
          productImages: ['https://http2.mlstatic.com/D_NQ_NP_galaxy-s24.webp', 'https://http2.mlstatic.com/D_NQ_NP_iphone-15.webp'],
          brollVideos: [],
          totalDuration: 120,
          fps: 30,
        }}
      />
    </>
  );
};

registerRoot(RemotionRoot);
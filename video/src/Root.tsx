import { Composition, registerRoot } from 'remotion';
import { ReviewVideo } from './compositions/ReviewVideo';
import { ComparisonVideo } from './compositions/ComparisonVideo';

const ReviewVideoAny = ReviewVideo as any;
const ComparisonVideoAny = ComparisonVideo as any;

export const RemotionRoot = () => {
  return (
    <>
      <Composition
        id="ReviewVideo"
        component={ReviewVideoAny}
        durationInFrames={3600}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{
          title: 'Samsung Galaxy S24 Ultra',
          imageUrl: 'https://http2.mlstatic.com/D_NQ_NP_galaxy-s24.webp',
          score: 9.2,
          category: 'Smartphones',
          hook: 'Pare! Antes de comprar o Galaxy S24 Ultra, veja isso!',
          scenes: [
            { id: 1, text: 'Chegou o Samsung Galaxy S24 Ultra, será que vale o investimento?', duration: 5, visualCue: 'Produto em destaque', brollKeywords: ['product reveal'], startFrame: 90, endFrame: 240 },
            { id: 2, text: 'Pelo preço de R$ 6.999, ele promete muito. Vamos testar.', duration: 7, visualCue: 'Preço na tela', brollKeywords: ['price tag'], startFrame: 240, endFrame: 450 },
            { id: 3, text: 'Design premium, construção sólida. Na mão passa confiança.', duration: 8, visualCue: 'Close nos detalhes', brollKeywords: ['premium design'], startFrame: 450, endFrame: 690 },
            { id: 4, text: 'Desempenho surpreendeu. Rodo tudo liso, sem engasgos.', duration: 8, visualCue: 'Apps e jogos rodando', brollKeywords: ['performance test'], startFrame: 690, endFrame: 930 },
            { id: 5, text: 'Bateria aguenta o dia todo tranquilo. Carregamento rápido.', duration: 7, visualCue: 'Ícone de bateria', brollKeywords: ['battery life'], startFrame: 930, endFrame: 1140 },
            { id: 6, text: 'Pontos fracos: preço alto e sem carregador na caixa.', duration: 7, visualCue: 'Lista de contras', brollKeywords: ['cons list'], startFrame: 1140, endFrame: 1350 },
            { id: 7, text: 'Veredicto: Galaxy S24 Ultra é top, mas só compre se precisar do melhor.', duration: 8, visualCue: 'Nota final', brollKeywords: ['verdict'], startFrame: 1350, endFrame: 1590 },
          ],
          callToAction: 'Link na descrição para comprar com desconto!',
          audioUrl: '/audio/sample.mp3',
          subtitleEntries: [
            { start: 0, end: 3, text: 'Pare! Antes de comprar o Galaxy S24 Ultra, veja isso!' },
            { start: 3, end: 8, text: 'Chegou o Samsung Galaxy S24 Ultra, será que vale o investimento?' },
            { start: 8, end: 15, text: 'Pelo preço de R$ 6.999, ele promete muito. Vamos testar.' },
            { start: 15, end: 23, text: 'Design premium, construção sólida. Na mão passa confiança.' },
            { start: 23, end: 31, text: 'Desempenho surpreendeu. Rodo tudo liso, sem engasgos.' },
            { start: 31, end: 38, text: 'Bateria aguenta o dia todo tranquilo. Carregamento rápido.' },
            { start: 38, end: 45, text: 'Pontos fracos: preço alto e sem carregador na caixa.' },
            { start: 45, end: 53, text: 'Veredicto: Galaxy S24 Ultra é top, mas só compre se precisar do melhor.' },
            { start: 53, end: 56, text: 'Link na descrição para comprar com desconto!' },
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
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{
          title: 'Galaxy S24 vs iPhone 15: Qual Comprar?',
          product1: { name: 'Galaxy S24', imageUrl: 'https://http2.mlstatic.com/D_NQ_NP_galaxy-s24.webp', score: 8.8 },
          product2: { name: 'iPhone 15', imageUrl: 'https://http2.mlstatic.com/D_NQ_NP_iphone-15.webp', score: 8.5 },
          categories: [
            { label: 'Design', score1: 8.5, score2: 9.0 },
            { label: 'Câmera', score1: 9.0, score2: 8.5 },
            { label: 'Desempenho', score1: 9.0, score2: 9.0 },
            { label: 'Bateria', score1: 8.5, score2: 7.5 },
            { label: 'Custo-Benefício', score1: 8.0, score2: 7.0 },
          ],
          winner: 1,
          hook: 'Galaxy S24 vs iPhone 15 - qual comprar em 2026?',
          scenes: [
            { id: 1, text: 'Galaxy S24 vs iPhone 15 - qual comprar em 2026?', duration: 4, visualCue: 'Dois produtos lado a lado', brollKeywords: ['smartphone comparison'], startFrame: 90, endFrame: 210, type: 'intro' },
            { id: 2, text: 'Galaxy S24: tela incrível, câmera versátil, S Pen opcional.', duration: 8, visualCue: 'Galaxy S24 em close', brollKeywords: ['samsung galaxy'], startFrame: 210, endFrame: 450, type: 'product1' },
            { id: 3, text: 'iPhone 15: ecossistema Apple, vídeo imbatível, Face ID.', duration: 8, visualCue: 'iPhone 15 em uso', brollKeywords: ['iphone'], startFrame: 450, endFrame: 690, type: 'product2' },
            { id: 4, text: '', duration: 10, visualCue: 'Barras comparativas', brollKeywords: ['comparison chart'], startFrame: 690, endFrame: 990, type: 'comparison' },
            { id: 5, text: '', duration: 5, visualCue: 'Coroa no vencedor', brollKeywords: ['winner'], startFrame: 990, endFrame: 1140, type: 'verdict' },
          ],
          callToAction: 'Confira a análise completa!',
          audioUrl: '/audio/sample.mp3',
          subtitleEntries: [
            { start: 0, end: 3, text: 'Galaxy S24 vs iPhone 15 - qual comprar em 2026?' },
            { start: 3, end: 11, text: 'Galaxy S24: tela incrível, câmera versátil, S Pen opcional.' },
            { start: 11, end: 19, text: 'iPhone 15: ecossistema Apple, vídeo imbatível, Face ID.' },
            { start: 19, end: 29, text: 'Comparando design, câmera, desempenho, bateria e custo-benefício.' },
            { start: 29, end: 34, text: 'Vencedor: Galaxy S24 com nota 8.8!' },
            { start: 34, end: 37, text: 'Link na descrição para comprar com desconto!' },
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
import { Composition, registerRoot } from 'remotion';
import { calculateEditorialMetadata, EditorialReview } from './compositions/EditorialReview';
import { ComparisonVideo } from './compositions/ComparisonVideo';

// Import Google Fonts via CSS
import './styles/global.css';

const ReviewVideoAny = EditorialReview as any;
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
        calculateMetadata={calculateEditorialMetadata}
        defaultProps={{
          title: 'Redmi Pad 2 Pro',
          imageUrl: '/assets/redmi-pad-2-pro-hero.png',
          score: 8.7,
          category: 'Tablets',
          hook: 'Tela grande. Sem estourar o orçamento.',
          hookDuration: 4.5,
          scenes: [
            { id: 1, text: 'Conheça o Redmi Pad 2 Pro. Tela de 12,1” e resolução 2,5K.', duration: 8, visualCue: 'Espaço para tudo', brollKeywords: [], startFrame: 135, endFrame: 375 },
            { id: 2, text: 'Mais espaço para assistir, estudar e ler com conforto.', duration: 6.5, visualCue: 'Tela ampla', brollKeywords: [], startFrame: 375, endFrame: 570 },
            { id: 3, text: 'Bateria de 12.000 mAh para acompanhar uma rotina longa.', duration: 8, visualCue: 'Menos tomada. Mais rotina.', brollKeywords: [], startFrame: 570, endFrame: 810 },
            { id: 4, text: 'Snapdragon 7s Gen 4 para o uso cotidiano e multitarefa.', duration: 5.8, visualCue: 'Desempenho para o dia a dia', brollKeywords: [], startFrame: 810, endFrame: 984 },
            { id: 5, text: 'Quatro alto-falantes com Dolby Atmos.', duration: 5, visualCue: 'Áudio imersivo', brollKeywords: [], startFrame: 984, endFrame: 1134 },
            { id: 6, text: 'Expansão por cartão microSD de até 2 TB.', duration: 6.7, visualCue: 'Espaço para seus arquivos', brollKeywords: [], startFrame: 1134, endFrame: 1335 },
            { id: 7, text: 'A tela é LCD, não AMOLED. Acessórios variam conforme a versão.', duration: 6.3, visualCue: 'O que vale saber', brollKeywords: [], startFrame: 1335, endFrame: 1524 },
            { id: 8, text: 'Tela ampla, boa autonomia e recursos úteis: o Redmi Pad 2 Pro merece entrar na lista.', duration: 6.4, visualCue: 'Uma escolha equilibrada', brollKeywords: [], startFrame: 1524, endFrame: 1716 },
          ],
          callToAction: 'Confira preço e disponibilidade antes de escolher.',
          audioUrl: '/assets/redmi-pad-2-pro-voiceover.mp3',
          subtitleEntries: [
            { start: 0, end: 4.5, text: 'Quer um tablet de tela grande sem pagar preço de topo de linha?' },
            { start: 4.5, end: 12.5, text: 'Conheça o Redmi Pad 2 Pro. Tela de 12,1” e resolução 2,5K.' },
            { start: 12.5, end: 19, text: 'Mais espaço para assistir, estudar e ler com conforto.' },
            { start: 19, end: 27, text: 'Bateria de 12.000 mAh para acompanhar uma rotina longa.' },
            { start: 27, end: 32.8, text: 'Snapdragon 7s Gen 4 para o uso cotidiano e multitarefa.' },
            { start: 32.8, end: 37.8, text: 'Quatro alto-falantes com Dolby Atmos.' },
            { start: 37.8, end: 44.5, text: 'Expansão por cartão microSD de até 2 TB.*' },
            { start: 44.5, end: 50.8, text: 'A tela é LCD, não AMOLED. Acessórios variam conforme a versão.' },
            { start: 50.8, end: 57.2, text: 'Tela ampla, boa autonomia e recursos úteis: o Redmi Pad 2 Pro merece entrar na lista.' },
            { start: 57.2, end: 60, text: 'Confira preço e disponibilidade antes de escolher.' },
          ],
          productImages: ['/assets/redmi-pad-2-pro-hero.png'],
          brollVideos: [],
          totalDuration: 60,
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

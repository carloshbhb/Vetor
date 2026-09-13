import { Composition } from 'remotion';
import { ReviewVideo } from './compositions/ReviewVideo';
import { ComparisonVideo } from './compositions/ComparisonVideo';

export const RemotionRoot = () => {
  return (
    <>
      <Composition
        id="ReviewVideo"
        component={ReviewVideo}
        durationInFrames={450}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{
          title: 'Produto Exemplo',
          imageUrl: 'https://via.placeholder.com/500',
          score: 8.5,
          pros: ['Ótima qualidade', 'Bateria longa', 'Design premium'],
          cons: ['Preço alto', 'Poucas cores'],
          verdict: 'Excelente produto para quem busca qualidade.',
          category: 'Smartphones',
        }}
      />
      <Composition
        id="ComparisonVideo"
        component={ComparisonVideo}
        durationInFrames={600}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{
          title: 'Produto A vs Produto B',
          product1: {
            name: 'Produto A',
            imageUrl: 'https://via.placeholder.com/400',
            score: 8.5,
          },
          product2: {
            name: 'Produto B',
            imageUrl: 'https://via.placeholder.com/400',
            score: 7.8,
          },
          categories: [
            { label: 'Design', score1: 9.0, score2: 8.0 },
            { label: 'Desempenho', score1: 8.5, score2: 7.5 },
            { label: 'Bateria', score1: 8.0, score2: 9.0 },
          ],
          winner: 1 as const,
        }}
      />
    </>
  );
};

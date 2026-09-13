import { Composition, Sequence, useCurrentFrame } from 'remotion';
import { ReviewVideo } from './compositions/ReviewVideo';
import { ComparisonVideo } from './compositions/ComparisonVideo';

interface VideoProps {
  type: 'review' | 'comparison';
  data: Record<string, unknown>;
}

export const Video: React.FC<VideoProps> = ({ type, data }) => {
  if (type === 'review') {
    return <ReviewVideo {...(data as any)} />;
  }

  return <ComparisonVideo {...(data as any)} />;
};

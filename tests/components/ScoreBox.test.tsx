import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import ScoreBox from '@/components/review/ScoreBox';

describe('ScoreBox', () => {
  const defaultProps = {
    overallScore: 8.5,
    bars: [
      { label: 'Tela', value: 9.0, pct: 90 },
      { label: 'Bateria', value: 7.5, pct: 75 },
      { label: 'Design', value: 8.0, pct: 80 },
    ],
  };

  it('renders overall score correctly', () => {
    render(<ScoreBox {...defaultProps} />);
    expect(screen.getByText('8.5')).toBeInTheDocument();
  });

  it('renders all score bars', () => {
    render(<ScoreBox {...defaultProps} />);
    expect(screen.getByText('Tela')).toBeInTheDocument();
    expect(screen.getByText('Bateria')).toBeInTheDocument();
    expect(screen.getByText('Design')).toBeInTheDocument();
  });

  it('displays bar values with one decimal', () => {
    render(<ScoreBox {...defaultProps} />);
    expect(screen.getByText('9.0')).toBeInTheDocument();
    expect(screen.getByText('7.5')).toBeInTheDocument();
    expect(screen.getByText('8.0')).toBeInTheDocument();
  });

  it('has correct aria-label for accessibility', () => {
    render(<ScoreBox {...defaultProps} />);
    expect(screen.getByLabelText('Pontuação geral')).toBeInTheDocument();
    expect(screen.getByLabelText('8.5 de 10')).toBeInTheDocument();
  });

  it('renders score label', () => {
    render(<ScoreBox {...defaultProps} />);
    expect(screen.getByText('Nota Vetor Blog')).toBeInTheDocument();
  });

  it('renders stars based on score', () => {
    render(<ScoreBox {...defaultProps} />);
    const starsElement = screen.getByLabelText('8.5 de 10');
    expect(starsElement.textContent).toContain('★');
  });

  it('renders empty bars array gracefully', () => {
    render(<ScoreBox overallScore={5.0} bars={[]} />);
    expect(screen.getByText('5.0')).toBeInTheDocument();
  });
});

import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import ProsConsGrid from '@/components/review/ProsConsGrid';

describe('ProsConsGrid', () => {
  const defaultProps = {
    pros: ['Tela AMOLED excelente', 'Bateria dura 2 dias', 'Ótimo custo-benefício'],
    cons: ['Sem NFC', 'GPS impreciso', 'App limitado'],
  };

  it('renders all pros items', () => {
    render(<ProsConsGrid {...defaultProps} />);
    expect(screen.getByText('Tela AMOLED excelente')).toBeInTheDocument();
    expect(screen.getByText('Bateria dura 2 dias')).toBeInTheDocument();
    expect(screen.getByText('Ótimo custo-benefício')).toBeInTheDocument();
  });

  it('renders all cons items', () => {
    render(<ProsConsGrid {...defaultProps} />);
    expect(screen.getByText('Sem NFC')).toBeInTheDocument();
    expect(screen.getByText('GPS impreciso')).toBeInTheDocument();
    expect(screen.getByText('App limitado')).toBeInTheDocument();
  });

  it('renders pros and cons headers', () => {
    render(<ProsConsGrid {...defaultProps} />);
    expect(screen.getByText('✓ Prós')).toBeInTheDocument();
    expect(screen.getByText('× Contras')).toBeInTheDocument();
  });

  it('has correct aria-labels for accessibility', () => {
    render(<ProsConsGrid {...defaultProps} />);
    expect(screen.getByLabelText('Pontos positivos')).toBeInTheDocument();
    expect(screen.getByLabelText('Pontos negativos')).toBeInTheDocument();
  });

  it('renders empty arrays gracefully', () => {
    render(<ProsConsGrid pros={[]} cons={[]} />);
    expect(screen.getByText('✓ Prós')).toBeInTheDocument();
    expect(screen.getByText('× Contras')).toBeInTheDocument();
  });

  it('renders single item in each list', () => {
    render(<ProsConsGrid pros={['Único pró']} cons={['Único contra']} />);
    expect(screen.getByText('Único pró')).toBeInTheDocument();
    expect(screen.getByText('Único contra')).toBeInTheDocument();
  });
});

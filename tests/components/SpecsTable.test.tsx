import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import SpecsTable from '@/components/review/SpecsTable';

describe('SpecsTable', () => {
  const defaultProps = {
    specs: [
      { label: 'Tela', value: 'AMOLED 1.6"' },
      { label: 'Bateria', value: '300mAh' },
      { label: 'Resistência', value: 'IP68' },
    ],
  };

  it('renders table headers', () => {
    render(<SpecsTable {...defaultProps} />);
    expect(screen.getByText('Especificação')).toBeInTheDocument();
    expect(screen.getByText('Detalhe')).toBeInTheDocument();
  });

  it('renders all spec labels', () => {
    render(<SpecsTable {...defaultProps} />);
    expect(screen.getByText('Tela')).toBeInTheDocument();
    expect(screen.getByText('Bateria')).toBeInTheDocument();
    expect(screen.getByText('Resistência')).toBeInTheDocument();
  });

  it('renders all spec values', () => {
    render(<SpecsTable {...defaultProps} />);
    expect(screen.getByText('AMOLED 1.6"')).toBeInTheDocument();
    expect(screen.getByText('300mAh')).toBeInTheDocument();
    expect(screen.getByText('IP68')).toBeInTheDocument();
  });

  it('renders empty specs array', () => {
    render(<SpecsTable specs={[]} />);
    expect(screen.getByText('Especificação')).toBeInTheDocument();
    expect(screen.getByText('Detalhe')).toBeInTheDocument();
  });

  it('renders specs with HTML in values', () => {
    const specsWithHtml = [
      { label: 'Peso', value: '<strong>180g</strong>' },
    ];
    render(<SpecsTable specs={specsWithHtml} />);
    expect(screen.getByText('180g')).toBeInTheDocument();
  });
});

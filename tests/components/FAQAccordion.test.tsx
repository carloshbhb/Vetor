import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import FAQAccordion from '@/components/review/FAQAccordion';

describe('FAQAccordion', () => {
  const defaultProps = {
    faq: [
      { question: 'Vale a pena comprar?', answer: 'Sim, é um ótimo produto.' },
      { question: 'Quanto custa?', answer: 'O preço médio é R$ 250.' },
      { question: 'Tem garantia?', answer: 'Sim, 1 ano de garantia.' },
    ],
  };

  it('renders all questions', () => {
    render(<FAQAccordion faq={defaultProps.faq} />);
    expect(screen.getByText('Vale a pena comprar?')).toBeInTheDocument();
    expect(screen.getByText('Quanto custa?')).toBeInTheDocument();
    expect(screen.getByText('Tem garantia?')).toBeInTheDocument();
  });

  it('answers are hidden by default', () => {
    render(<FAQAccordion faq={defaultProps.faq} />);
    expect(screen.queryByText('Sim, é um ótimo produto.')).not.toBeVisible();
    expect(screen.queryByText('O preço médio é R$ 250.')).not.toBeVisible();
  });

  it('shows answer when question is clicked', async () => {
    render(<FAQAccordion faq={defaultProps.faq} />);
    
    const firstQuestion = screen.getByText('Vale a pena comprar?');
    fireEvent.click(firstQuestion);
    
    expect(screen.getByText('Sim, é um ótimo produto.')).toBeVisible();
  });

  it('hides answer when question is clicked again', async () => {
    render(<FAQAccordion faq={defaultProps.faq} />);
    
    const firstQuestion = screen.getByText('Vale a pena comprar?');
    fireEvent.click(firstQuestion);
    expect(screen.getByText('Sim, é um ótimo produto.')).toBeVisible();
    
    fireEvent.click(firstQuestion);
    expect(screen.queryByText('Sim, é um ótimo produto.')).not.toBeVisible();
  });

  it('renders empty FAQ array', () => {
    render(<FAQAccordion faq={[]} />);
    expect(document.querySelector('.faq-list')).toBeInTheDocument();
  });

  it('has correct schema.org markup', () => {
    render(<FAQAccordion faq={defaultProps.faq} />);
    const details = document.querySelectorAll('details');
    expect(details.length).toBe(3);
    details.forEach(detail => {
      expect(detail.getAttribute('itemprop')).toBe('mainEntity');
    });
  });
});

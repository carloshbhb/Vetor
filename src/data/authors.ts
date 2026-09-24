export interface Author {
  slug: string;
  name: string;
  role: string;
  tagline: string;
  bio: string;
  credentials: string[];
}

export const authors: Author[] = [
  {
    slug: 'editor-vetor',
    name: 'Editor Vetor',
    role: 'Editor-chefe',
    tagline:
      'Editor-chefe do vetor.blog — reviews independentes com critérios claros e notas de 0 a 10.',
    bio: 'À frente da redação do vetor.blog, escreve e revisa as análises do site com foco em wearables, fones de ouvido e notebooks. Cada texto segue o mesmo padrão: critérios públicos, comparação com concorrentes na mesma faixa de preço, prós e contras honestos e um veredicto direto — em português, sem achismo.',
    credentials: [
      'Cobertura editorial de wearables, áudio e notebooks desde a fundação do vetor.blog',
      'Avaliações baseadas em uso real e comparação direta com concorrentes',
      'Nota e veredicto definidos sem influência de patrocínio ou comissão de afiliado',
    ],
  },
];

export const primaryAuthor: Author = authors[0];

export function getAuthorBySlug(slug: string): Author | undefined {
  return authors.find((author) => author.slug === slug);
}

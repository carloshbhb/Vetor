export interface Author {
  slug: string;
  name: string;
  role: string;
  tagline: string;
  bio: string;
  credentials: string[];
  avatar?: string;
}

export const authors: Author[] = [
  {
    slug: 'editor-vetor',
    name: 'Editor Vetor',
    role: 'Editor-chefe',
    avatar: '/images/authors/editora-chefe.webp',
    tagline:
      'Editor-chefe do vetor.blog — reviews independentes com critérios claros e notas de 0 a 10.',
    bio: 'À frente da redação do vetor.blog, escreve e revisa as análises do site com foco em wearables, fones de ouvido e notebooks. Cada texto segue o mesmo padrão: critérios públicos, comparação com concorrentes relevantes, prós e contras claros e um veredicto explicado — em português, com transparência sobre limites e fontes.',
    credentials: [
      'Cobertura editorial de wearables, áudio e notebooks desde a fundação do vetor.blog',
      'Avaliações baseadas em informações verificáveis, critérios públicos e comparação com concorrentes relevantes',
      'Nota e veredicto definidos sem influência de patrocínio ou comissão de afiliado',
    ],
  },
];

export const primaryAuthor: Author = authors[0];

export function getAuthorBySlug(slug: string): Author | undefined {
  return authors.find((author) => author.slug === slug);
}

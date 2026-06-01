// ─────────────────────────────────────────────────────────────────────────────
// Vetor Blog — Author Configuration (EEAT / GEO)
// ─────────────────────────────────────────────────────────────────────────────

export interface Author {
  name: string;
  role: string;
  bio: string;
  linkedin: string;
  avatar: string;
}

export const defaultAuthor: Author = {
  name: 'Henrique Vetor',
  role: 'Fundador e Editor-Chefe',
  bio: 'Especialista em tecnologia e consumidor ávido. Testa pessoalmente cada produto antes de publicar uma review. Mais de 5 anos de experiência em análises técnicas de wearables, games e eletrônicos.',
  linkedin: 'https://www.linkedin.com/in/henriquevetor',
  avatar: '/authors/henrique-vetor.jpg',
};

export function getAuthorSchema(author: Author = defaultAuthor) {
  return {
    '@type': 'Person',
    name: author.name,
    jobTitle: author.role,
    description: author.bio,
    url: author.linkedin,
    image: author.avatar,
    sameAs: [author.linkedin],
    worksFor: {
      '@type': 'Organization',
      name: 'Vetor Blog',
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Vetor Blog — Backlink Management System
// ─────────────────────────────────────────────────────────────────────────────

export interface Backlink {
  id: string;
  sourceUrl: string;
  sourceDomain: string;
  targetUrl: string;
  anchorText: string;
  type: 'guest-post' | 'resource' | 'mention' | 'directory' | 'social' | 'other';
  status: 'active' | 'pending' | 'broken' | 'redirected';
  domainAuthority?: number;
  pageAuthority?: number;
  firstSeen: string;
  lastChecked: string;
  notes?: string;
}

export interface GuestPostOpportunity {
  id: string;
  domain: string;
  url: string;
  da: number;
  traffic: number;
  niche: string;
  contactEmail?: string;
  contactUrl?: string;
  status: 'discovered' | 'contacted' | 'pitched' | 'published' | 'rejected';
  notes?: string;
  createdAt: string;
}

// Calculate domain authority from URL
export function getDomainFromUrl(url: string): string {
  try {
    const hostname = new URL(url).hostname;
    return hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

// Generate guest post pitch template
export function generateGuestPostPitch(domain: string, niche: string): string {
  return `
Olá!

Meu nome é Henrique, sou editor do Vetor Blog (vetor.blog), um site especializado em reviews detalhados de produtos de tecnologia.

Identrei que o ${domain} também atua no nicho de ${niche} e gostaria de propor uma parceria:

**Proposta:**
- Artigo exclusivo e original sobre um produto relevante para seu público
- Conteúdo de alta qualidade com análise detalhada, prós/contras e recomendações
- Link para o Vetor Blog como fonte adicional de informação

**Por que colaborar conosco?**
- Conteúdo gerado com metodologia de teste rigorosa
- Foco em EEAT (Experiência, Expertise, Autoridade, Confiança)
- Público qualificado e engajado

Posso enviar um rascunho do artigo para sua avaliação?

Abraço,
Henrique Vetor
Editor | Vetor Blog
https://vetor.blog
  `.trim();
}

// Backlink audit checklist
export const backlinkAuditChecklist = [
  {
    category: 'Qualidade do Domínio',
    items: [
      'Verificar Domain Authority (DA) do site',
      'Verificar relevância do nicho',
      'Verificar tráfego estimado',
      'Verificar spam score',
    ],
  },
  {
    category: 'Âncora do Link',
    items: [
      'Diversificar texto-âncora',
      'Evitar过度 otimização',
      'Incluir marca + palavra-chave',
      'Usar links naturais ("clique aqui", "saiba mais")',
    ],
  },
  {
    category: 'Posicionamento',
    items: [
      'Link no conteúdo editorial (melhor)',
      'Link no rodapé (menos valor)',
      'Link em sidebar (valor moderado)',
      'Link em comentários (baixo valor)',
    ],
  },
  {
    category: 'Técnico',
    items: [
      'Verificar se o link é follow/nofollow',
      'Verificar se a página está indexada',
      'Verificar velocidade de carregamento',
      'Verificar responsividade mobile',
    ],
  },
];

// Backlink monitoring API endpoints
export const backlinkMonitoringEndpoints = {
  // Ahrefs API (paid)
  ahrefs: 'https://apiv2.ahrefs.com',
  
  // Moz API (paid)
  moz: 'https://lsapi.seomoz.com/v2',
  
  // Google Search Console (free)
  searchConsole: 'https://www.googleapis.com/webmasters/v3',
  
  // Bing Webmaster Tools (free)
  bing: 'https://api.bing.com/osjson.aspx',
};

// Calculate backlink score
export function calculateBacklinkScore(backlinks: Backlink[]): {
  total: number;
  active: number;
  averageDA: number;
  score: number;
} {
  const active = backlinks.filter(b => b.status === 'active');
  const totalDA = active.reduce((sum, b) => sum + (b.domainAuthority || 0), 0);
  const averageDA = active.length > 0 ? totalDA / active.length : 0;
  
  // Score calculation (0-100)
  const quantityScore = Math.min(active.length / 50, 1) * 30; // Max 30 points for 50+ backlinks
  const qualityScore = Math.min(averageDA / 50, 1) * 40; // Max 40 points for DA 50+
  const diversityScore = calculateDiversityScore(active) * 30; // Max 30 points for diversity
  
  const score = Math.round(quantityScore + qualityScore + diversityScore);
  
  return {
    total: backlinks.length,
    active: active.length,
    averageDA: Math.round(averageDA),
    score,
  };
}

// Calculate diversity score based on unique domains
function calculateDiversityScore(backlinks: Backlink[]): number {
  const uniqueDomains = new Set(backlinks.map(b => b.sourceDomain));
  const uniqueCount = uniqueDomains.size;
  
  return Math.min(uniqueCount / 20, 1); // Max 1 for 20+ unique domains
}

// Backlink outreach templates
export const outreachTemplates = {
  guestPost: {
    subject: 'Proposta de Colaboração - Artigo para {domain}',
    body: `
Olá {name},

Sou Henrique, editor do Vetor Blog ({site_url}).

{reason}

Gostaria de propor uma colaboração:

1. Artigo exclusivo sobre {topic}
2. Análise detalhada com prós/contras
3. Link para o Vetor Blog como fonte

Posso enviar um rascunho?

Abraço,
Henrique
    `,
  },
  resourcePage: {
    subject: 'Recurso para sua página de {topic}',
    body: `
Olá {name},

Encontrei sua página sobre {topic} e gostaria de sugerir nosso conteúdo como recurso adicional:

{content_url}

É uma análise detalhada que pode agregar valor para seus leitores.

Obrigado!
Henrique
    `,
  },
  brokenLink: {
    subject: 'Link quebrado em sua página',
    body: `
Olá {name},

Notei que o link {broken_url} em sua página está quebrado.

Tempos um conteúdo similar e atualizado que pode substituí-lo:
{replacement_url}

Espero que ajude!
Henrique
    `,
  },
};
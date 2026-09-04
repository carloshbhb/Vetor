import { NextRequest, NextResponse } from 'next/server';
import { getPublishedReviews } from '@/lib/db';

export const dynamic = 'force-dynamic';

const categories = [
  'Wearables / Smartbands', 'Acessórios para Games', 'Notebooks', 'Áudio Profissional',
  'Smartphones', 'Tablets', 'Eletroportáteis', 'Casa Inteligente',
  'Câmeras de Segurança', 'Fones de Ouvido', 'Geral'
];

const categoryDescriptions: Record<string, string> = {
  'Wearables / Smartbands': 'Reviews de smartbands e smartwatches para saúde, fitness e estilo. Comparativos e análise de custo-benefício.',
  'Acessórios para Games': 'Controles, headsets, cadeiras gamers e acessórios para PC e console. Testes detalhados de desempenho.',
  'Notebooks': 'Notebooks para trabalho, estudo, games e produção. Análises de processador, GPU, tela e bateria.',
  'Áudio Profissional': 'Microfones, fones de ouvido, interfaces de áudio e equipamentos de estúdio para profissionais e amadores.',
  'Smartphones': 'Reviews de smartphones, celulares e acessórios. Câmera, bateria, performance e custo-benefício.',
  'Tablets': 'Reviews de tablets para trabalho, estudo e lazer. Comparativos de tela, armazenamento e autonomia.',
  'Eletroportáteis': 'Liquidificadores, air fryers, aspiradores de pó e eletrodomésticos para o dia a dia.',
  'Casa Inteligente': 'Dispositivos smart home, interruptores inteligentes, lâmpadas e câmeras de segurança residencial.',
  'Câmeras de Segurança': 'Câmeras IP, sistemas de monitoramento e alarmes. Testes de qualidade de imagem e aplicativo.',
  'Fones de Ouvido': 'Fones de ouvido, earbuds e headsets. Análise de qualidade de som, conforto e cancelamento de ruído.',
  'Geral': 'Reviews diversos de produtos de tecnologia e eletrônicos. Análises imparciais e testes reais.',
};

async function buildLlmsContent() {
  const rawUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.vetor.blog';
  const SITE_URL = rawUrl.startsWith('http') ? rawUrl : `https://${rawUrl}`;

  let reviews: Awaited<ReturnType<typeof getPublishedReviews>> = [];
  try {
    reviews = await getPublishedReviews();
  } catch (e) {
    console.error('[LLMS] Error fetching reviews:', e);
  }

  return `# Vetor Blog - Reviews Sinceros de Produtos

## Sobre
O Vetor Blog é uma publicação brasileira especializada em reviews detalhados e análises técnicas de produtos de tecnologia, wearables, games e muito mais. Nosso compromisso é com a verdade e a transparência para compradores inteligentes.

## Conteúdo Disponível
- Reviews completos com notas rigorosas (0-10)
- Comparativos entre produtos concorrentes
- Fichas técnicas detalhadas
- Perguntas frequentes (FAQ)
- Análises de custo-benefício
- Pesquisa de Mercado com dados originais

## Categorias
${categories.map(c => `- ${c}: ${categoryDescriptions[c] || 'Reviews de produtos.'}`).join('\n')}

## Política de Conteúdo
- Todo conteúdo é escrito por especialistas humanos
- Testamos produtos antes de publicar reviews
- Não aceitamos pagamentos por notas positivas
- Preços são verificados diariamente via Mercado Livre
- Links de afiliados são identificados

## Dados de Reviews
- Total de reviews publicados: ${reviews.length}
- Nota média geral: ${reviews.length > 0 ? (reviews.reduce((s, r) => s + r.hero.overallScore, 0) / reviews.length).toFixed(1) : '—'}/10
- Categorias ativas: ${categories.length}

## Contato
- Site: ${SITE_URL}
- Email: contato@vetor.blog
- LinkedIn: https://www.linkedin.com/in/henriquevetor

## Atualização
- Frequência: Mínimo 2 reviews por semana
- Última atualização: ${new Date().toLocaleDateString('pt-BR')}
`;
}

export async function GET() {
  const llmsContent = await buildLlmsContent();
  return new NextResponse(llmsContent, {
    headers: {
      'Content-Type': 'text/plain',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}

export async function POST() {
  const llmsContent = await buildLlmsContent();
  return new NextResponse(llmsContent, {
    headers: {
      'Content-Type': 'text/plain',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}

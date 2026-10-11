import assert from 'node:assert/strict';
import { validateGeneratedReview } from '../src/lib/content-quality';

const productName = 'Samsung Galaxy Fit3';
const paragraph = `Esta seção analisa ${productName} com critérios claros, separa informações disponíveis de dados que precisam de confirmação e ajuda o leitor a comparar alternativas antes da compra. `;
const content = Array.from({ length: 8 }, (_, index) =>
  `<h2>Seção ${index + 1}: análise de ${productName}</h2><p>${paragraph.repeat(8)}</p>`
).join('\n');

const validPayload = {
  product: productName,
  category: 'Wearables',
  content,
  sections: [
    { heading: 'Visão geral', content: `<p>${paragraph.repeat(2)}</p>` },
    { heading: 'Recursos', content: `<p>${paragraph.repeat(2)}</p>` },
    { heading: 'Limitações', content: `<p>${paragraph.repeat(2)}</p>` },
    { heading: 'Veredito', content: `<p>${paragraph.repeat(2)}</p>` },
  ],
  hero_lead: `Este review organiza as informações disponíveis sobre ${productName} e indica o que confirmar antes de comprar. ${'Leia os critérios com atenção. '.repeat(2)}`,
  specs: [
    { label: 'Produto', value: productName },
    { label: 'Categoria', value: 'Wearables' },
    { label: 'Preço', value: 'Consulte o anúncio' },
    { label: 'Fontes', value: 'Consulte a ficha oficial' },
  ],
  hero_bars: [
    { pct: 70, label: 'Recursos documentados', value: 7 },
    { pct: 60, label: 'Dados disponíveis', value: 6 },
    { pct: 50, label: 'Comparabilidade', value: 5 },
  ],
  pros: ['Identificação exata do produto', 'Critérios claros de comparação', 'Limitações descritas com transparência'],
  cons: ['Preço deve ser confirmado no anúncio', 'Compatibilidade deve ser verificada', 'Não há dados de medições próprias fornecidos'],
  faq: [
    { question: 'O que conferir antes de comprar?', answer: 'Confirme o código exato, a ficha técnica, a garantia e as condições atuais do anúncio.' },
    { question: 'Como comparar alternativas?', answer: 'Use critérios equivalentes e compare somente características documentadas para cada modelo.' },
    { question: 'O preço é definitivo?', answer: 'Não. Consulte o anúncio para confirmar preço, frete, estoque e prazo antes de concluir a compra.' },
  ],
  meta_title: 'Samsung Galaxy Fit3: análise e vale a pena?',
  meta_description: 'Veja os recursos, limitações e critérios para decidir se o Samsung Galaxy Fit3 combina com seu uso antes de comprar.',
  compare_table: {
    columns: ['Critério', productName, 'Alternativa'],
    rows: [
      { feature: 'Preço', values: ['Consultar anúncio', 'Não informado'], winner: -1 },
      { feature: 'Recursos', values: ['Consultar ficha oficial', 'Consultar ficha oficial'], winner: -1 },
      { feature: 'Garantia', values: ['Confirmar no anúncio', 'Confirmar no anúncio'], winner: -1 },
    ],
    caption: 'Comparação de critérios que devem ser confirmados nas fontes de cada modelo.',
    winnerCol: -1,
  },
};

const validResult = validateGeneratedReview(validPayload, { source: 'cron', slug: 'samsung-galaxy-fit3' });
assert.equal(validResult.ok, true, `esperava aprovação, recebeu: ${validResult.ok ? '' : validResult.issues.join('; ')}`);

const noHeadingsResult = validateGeneratedReview({
  ...validPayload,
  content: content.replace(/<h2\b/gi, '<h4'),
}, { source: 'cron', slug: 'samsung-galaxy-fit3-no-headings' });
assert.equal(noHeadingsResult.ok, false, 'review sem H2/H3 deve ser reprovado');

const unsupportedResult = validateGeneratedReview({
  ...validPayload,
  content: `${content}<p>Em nossos testes, medimos resultados que não constam nas fontes.</p>`,
}, { source: 'cron', slug: 'samsung-galaxy-fit3-unsupported' });
assert.equal(unsupportedResult.ok, false, 'alegações de testes não fornecidos devem ser reprovadas');

console.log('content-quality tests passed');

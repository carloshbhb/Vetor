import assert from 'node:assert/strict';
import { validateGeneratedViralArticle } from '../src/lib/content-quality';

const products = [
  { name: 'Galaxy S24', slug: 'galaxy-s24', imageUrl: 'https://example.com/galaxy-s24.webp' },
  { name: 'iPhone 15', slug: 'iphone-15', imageUrl: 'https://example.com/iphone-15.webp' },
];
const paragraph = [
  'Galaxy S24 e iPhone 15 atendem a perfis diferentes. Compare os recursos documentados, a compatibilidade, a garantia, o preço total, o frete e as condições de devolução antes de escolher.',
  'Consulte as fichas oficiais dos dois modelos e confira se a versão anunciada corresponde exatamente ao produto que pretende comprar. Para trabalho, estudo ou entretenimento, priorize critérios objetivos em vez de presumir desempenho, autonomia ou qualidade sem uma fonte verificável.',
  'O melhor modelo depende das suas necessidades, do orçamento disponível e dos recursos que realmente utilizará. Confira o preço e a disponibilidade no anúncio e compare condições equivalentes antes de concluir a compra.',
].join(' ');
const articleContent = [
  ...Array.from({ length: 8 }, (_, index) =>
    '<h2>Comparação detalhada: critério ' + (index + 1) + '</h2><p>' + (paragraph + ' ').repeat(3) + '</p>'
  ),
  '<h2>Tabela comparativa</h2><table><thead><tr><th>Critério</th><th>Galaxy S24</th><th>iPhone 15</th></tr></thead><tbody><tr><td>Preço</td><td>Confirme no anúncio</td><td>Confirme no anúncio</td></tr><tr><td>Compatibilidade</td><td>Consulte a ficha oficial</td><td>Consulte a ficha oficial</td></tr></tbody></table>',
  '<h2>Dúvidas frequentes (FAQ)</h2><p>Qual modelo combina com seu uso? Compare as especificações oficiais e o ecossistema que você já utiliza.</p><p>Onde confirmar o preço? Consulte o anúncio atualizado antes de comprar.</p><p>Como decidir com segurança? Confira garantia, disponibilidade, compatibilidade e política de devolução.</p>',
  '<h2>Conclusão e próximos passos</h2><p>Compare preço, condições e recursos confirmados antes de escolher Galaxy S24 ou iPhone 15.</p>',
].join('\n');

const validPayload = {
  slug: 'galaxy-s24-vs-iphone-15',
  title: 'Galaxy S24 vs iPhone 15: qual vale a pena?',
  description: 'Comparativo de Galaxy S24 e iPhone 15 com critérios práticos para comparar recursos, compatibilidade, preço e condições antes de comprar.',
  content: articleContent,
  category: 'Smartphones',
  products,
  seo_title: 'Galaxy S24 vs iPhone 15: comparação completa',
  seo_description: 'Compare Galaxy S24 e iPhone 15 por recursos, compatibilidade, preço e garantia para escolher o modelo certo para seu perfil.',
};

const valid = validateGeneratedViralArticle(validPayload, { source: 'generator', slug: validPayload.slug });
assert.equal(valid.ok, true, valid.ok ? '' : valid.issues.join('; '));

const tooShort = validateGeneratedViralArticle({
  ...validPayload,
  content: '<h2>FAQ</h2><p>Galaxy S24 e iPhone 15: qual comprar? Onde ver o preço? Quais são os recursos?</p>',
}, { source: 'generator', slug: 'short-comparison' });
assert.equal(tooShort.ok, false, 'comparativo muito curto deve falhar na qualidade');

const unsupported = validateGeneratedViralArticle({
  ...validPayload,
  content: articleContent + '<p>Em nossos testes, medimos resultados próprios que não foram documentados.</p>',
}, { source: 'generator', slug: 'unsupported-comparison' });
assert.equal(unsupported.ok, false, 'alegações de teste não fornecidas devem ser recusadas');

console.log('viral quality tests passed');

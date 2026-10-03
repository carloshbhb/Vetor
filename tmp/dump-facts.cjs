const fs = require('fs');
function splitSentences(text) {
  return text.split(/(?<=[.!?…])\s+(?=[A-ZÀ-Ú"“'(\d💡>])/)
    .map((s) => s.trim()).filter((s) => s.length > 0);
}
const STOP = 'O A Os As Um Uma Em De Do Da Na No Se Que Para Com Por Ele Ela Este Esta Esse Essa Isso Você Seu Sua Nos Nas Dos Das Ao Além Como Quando Onde Qual Quais Quanto Tudo Todo Toda Nada Cada Outro Outra Mesmo Mesma Tal Tanto Muito Muita Pouco Pouca Certo Certa Grande Pequeno Pequena Melhor Pior Maior Menor Primeiro Primeira Sim Não Mais Menos Bem Ainda Já Também Até Desde Durante Entre Sobre Após Antes Depois Sem Sob Além Conforme Segundo Embora Enquanto Porque Contudo Entretanto Todavia Porém Logo Portanto Então Assim Dessa Deste Desse Nesta Neste Nesse Nessa Nesses Nessas Destes Destas Isto Ele Ela Eles Elas Nós Você Vocês Sr Sra Dr Dra'.split(' ');
const STOPSET = new Set(STOP);
function midCaps(text) {
  const out = new Set();
  for (const s of splitSentences(text)) {
    const words = s.match(/[A-Za-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u00FF0-9\u00AE\u2122-]+/g) || [];
    for (let i = 1; i < words.length; i++) {
      let w = words[i].replace(/^[“"']+|[”"'.:,;!?®™]+$/g, '');
      if (w.length > 2 && /^[A-ZÀ-Ú]/.test(w) && !STOPSET.has(w)) out.add(w);
    }
  }
  return [...out];
}
const d = [...JSON.parse(fs.readFileSync('tmp/rewrite-slices/slice-1.json','utf8')),...JSON.parse(fs.readFileSync('tmp/rewrite-slices/slice-2.json','utf8'))];
const out = [];
for (const r of d) {
  for (const s of r.sections) {
    const c = s.content || '';
    out.push({ slug: r.slug, id: s.id,
      digits: c.match(/\d+/g) || [],
      caps: midCaps(c),
      urls: c.match(/https?:\/\/\S+/g) || [],
      len: c.length });
  }
}
fs.writeFileSync('tmp/facts-dump.json', JSON.stringify(out, null, 1));
console.log('wrote ' + out.length + ' sections');

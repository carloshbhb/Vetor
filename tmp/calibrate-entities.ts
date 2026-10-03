import * as fs from 'fs';
import * as path from 'path';

const slicesDir = path.join(__dirname, 'rewrite-slices');
let eufy: { slug: string; sections: Array<{ id: string; content: string }> } | null = null;
for (const f of fs.readdirSync(slicesDir)) {
  if (!/^slice-\d+\.json$/.test(f)) continue;
  const arr = JSON.parse(fs.readFileSync(path.join(slicesDir, f), 'utf8'));
  const hit = arr.find((r: { slug: string }) => r.slug === 'robo-aspirador-eufy-g10-hybrid');
  if (hit) { eufy = hit; break; }
}
if (!eufy) throw new Error('eufy não achado');
const gemini = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'rewrite-dryrun', 'robo-aspirador-eufy-g10-hybrid.json'), 'utf8')
);

function caps(text: string): string[] {
  // Palavras capitalizadas no meio de frase (exclui primeira palavra de cada sentença).
  const out: string[] = [];
  const sentences = text.split(/(?<=[.!?…])\s+/);
  for (const s of sentences) {
    const words = s.match(/[A-Za-zÀ-ÖØ-öø-ÿ0-9®™-]+/g) || [];
    for (let i = 1; i < words.length; i++) {
      const w = words[i].replace(/^[“"']+|[”"'.:,;!?]+$/g, '');
      if (/^[A-ZÀ-Ú]/.test(w) && w.length > 2 && !/^(O|A|Os|As|Um|Uma|Em|De|Do|Da|Na|No|Se|Que|Para|Com|Por|Ele|Ela|Este|Esta|Esse|Essa|Isso|Você|Seu|Sua|Nos|Nas|Dos|Das|Ao|Às|E|Ou|Mas|Pois|Que|Como|Quando|Onde|Qual|Quais|Quanto|Tudo|Todo|Toda|Nada|Cada|Outro|Outra|Mesmo|Mesma|Tal|Tanto|Muito|Muita|Pouco|Pouca|Certo|Certa|Grande|Pequeno|Pequena|Melhor|Pior|Maior|Menor|Primeiro|Primeira|Sim|Não|Mais|Menos|Muito|Bem|Ainda|Já|Também|Até|Desde|Durante|Entre|Sobre|Após|Antes|Depois|Sem|Sob|Tras|Além|Aquém|Conforme|Segundo|Embora|Enquanto|Porque|Porquê|Porquanto|Contudo|Entretanto|Todavia|Porém|Logo|Portanto|Então|Assim|Dessa|Deste|Desse|Nesta|Neste|Nesse|Nessa|Nesses|Nessas|Destes|Destas|Daqueles|Naqueles|Aquelas|Aqueles|Aquilo|Isto|Isto|Ele|Ela|Eles|Elas|Nós|Vós|Você|Vocês|Senhor|Senhora|Sr|Sra|Dr|Dra)$/.test(w)) {
        out.push(w);
      }
    }
  }
  return [...new Set(out)];
}

console.log('== gemini bom: entidades capitalizadas novas por seção ==');
for (const sec of eufy.sections) {
  const rw = gemini.sections.find((s: { id: string }) => s.id === sec.id);
  if (!rw) continue;
  const origLower = sec.content.toLowerCase();
  const novel = caps(rw.content).filter((w) => !origLower.includes(w.toLowerCase()));
  console.log(`${novel.length === 0 ? 'PASS' : 'FLAG'} ${sec.id}: [${novel.join(', ')}]`);
}

console.log('== caso ruim ==');
const badSentences = [
  'A Samsung Galaxy Fit traz Snapdragon 450 com 2GB de RAM e roda com mais folga.',
  'A Samsung Galaxy Fit aparece na loja oficial e no Submarino, com descontos de 10% no fim de ano.',
  'O modelo 7L costuma ter cupom de R$50 em comparadores e na Magazine Luiza.',
  'Pedidos acima de R$200 saem com frete grátis nas duas lojas.',
];
const refSection = eufy.sections[0].content.toLowerCase();
for (const s of badSentences) {
  const novel = caps(s).filter((w) => !refSection.includes(w.toLowerCase()));
  console.log(`${novel.length ? 'FLAG' : 'PASS'} [${novel.join(', ')}] ${s.slice(0, 80)}`);
}

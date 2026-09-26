/**
 * Casos reais coletados da API ML. Roda offline: nao consome quota.
 * npx tsx tmp/fuzzy-cases.ts
 */
import { normalize, fuzzyScore } from './fuzzy-score';

const CASES: Array<[string, string, boolean, string]> = [
  // [product_name no banco, name retornado pela ML, deve casar?, nota]
  ['iPhone 17 256GB', 'iPhone 17 256 GB - Branco', true, 'numero+unidade separados'],
  ['iPhone 17 256GB', 'Apple iPhone 17 Pro Max (256 Gb) azul', false, 'Pro Max != base'],
  ['Apple Watch SE 2ª Geração', 'Pulseira New-Sport LTimports compativel com Apple Watch', false, 'pulseira nao e o watch'],
  ['Samsung Galaxy Watch 7 40mm', 'Samsung Galaxy Watch 5 - 40mm () Caixa Branco Puls', false, 'Watch 5 != Watch 7'],
  ['Motorola Moto G86 5G 256GB', 'Motorola Moto G86 5g Dual Sim 256 GB e 8 GB Ram', true, 'mesmo aparelho'],
  ['Motorola Moto G67 128GB', 'Smartphone Motorola Moto G35 5G 128GB Grafite', false, 'G35 != G67'],
  ['Samsung Galaxy S25 Ultra 256GB', 'Smartphone Samsung Galaxy S25 Câmera Tripla 256 Gb', false, 'S25 != S25 Ultra'],
  ['MacBook Air M3', 'MacBook Air MacBook Air 13 polegadas', false, 'Air 13" base != M3'],
  ['Huawei Freebuds 6', 'Huawei Freebuds Se 3 () Preto', false, 'Se 3 != 6'],
  ['Intelbras IM3C', 'Kit 6 Câmera De Segurança Intelbras Im3c Black Wi-', false, 'kit 6 unidades'],
  ['Air Fryer Mondial 55L', 'Air fryer EasyWays Air Fryer Chic de 5.5L preto/pr', false, '5.5L != 55L'],
  ['HP Spectre x360 16', 'PC portátil HP Spectre X360 4k Evo I7 16 Ram 1tb T', true, 'mesmo modelo'],
  ['Samsung Galaxy Buds 4 Pro', 'Capa de TPU transparente para Samsung Galaxy Buds', false, 'capa, nao fone'],
  ['Câmera Intelbras Im3c', 'Câmera de segurança Xiaomi Mi 360° Home Security 2k', false, 'marca diferente'],
  ['iPad 10ª Geração', 'Teclado Magnético iPad 10a Geração Bluetooth Ergon', false, 'teclado, nao tablet'],
  ['Logitech G Pro X Superlight 2', 'Mouse Gamer Logitech G Pro Series G Pro X Superlight 2 Preto', true, 'exato'],
  ['Controle 8BitDo Ultimate 2C', 'Controle 8BitDo Ultimate 2C Preto Hall Effect', true, 'exato'],
  ['Samsung Galaxy S24 Ultra', 'Samsung Galaxy S24 Ultra Branco', true, 'exato'],
  ['QCY AilyPods Lite', 'Fone De Ouvido Bluetooth QCY AilyPods Neo DT08 Sem', false, 'Neo DT08 != Lite'],
  ['Realme 16 5G 256GB', 'Celular preto Realme 16 5g 8gb 256gb', true, 'mesmo aparelho'],
  ['Samsung Galaxy A17 128GB 4GB', 'Smartphone Samsung Galaxy A17 4g 4gb 128gb', true, 'mesmo aparelho'],
  ['Notebook Acer Nitro V 15 16GB 512GB', 'Dell XPS 16GB RAM 512GB SSD.', false, 'marca diferente'],
  // product_name do banco carrega abreviacoes internas que a ML nao escreve
  ['TP-Link Tapo C210 Cam Seg', 'Câmera de segurança TP-Link Tapo C210 TAPO com resolução 3MP', true, 'sufixo "Cam Seg"'],
  ['TP-Link Tapo C500 Cam Seg', 'Câmera de segurança TP-Link TAPO-C500 TAPO com resolução FHD', true, 'sufixo "Cam Seg"'],
  ['Xiaomi Mi Home Security Camera 2K Cam Seg', 'Câmera de segurança Xiaomi Mi 360° Home Security 2k', true, 'sufixo "Cam Seg"'],
  ['Intelbras iM3C Cam Seg', 'Câmera De Segurança Intelbras Im3c Black Wi-Fi', true, 'sufixo "Cam Seg"'],
  // especificacao ausente no titulo da ML nao pode reprovar o produto
  ['Samsung Galaxy S25 Ultra 256GB', 'Samsung Galaxy S25 Ultra Cor Cinza', true, 'ML omite 256GB'],
  ['Motorola Signature 5G 512GB', 'Motorola Signature + 512 Gb Martini Olive', true, 'ML omite 5G'],
  ['Huawei Freebuds 6', 'HUAWEI FreeBuds Audimóveis NEO', false, '6 e modelo, nao especificacao'],
  // regressoes encontradas no dry-run de 2026-09-25: acessarios que herdam o nome
  ['Redmi Watch 5', 'Mesh For Redmi Watch 4 Redmi Watch 5 Redmi Watch 6 2.07 Marc', false, 'malha, nao o relogio'],
  ['Samsung Galaxy Watch Ultra', 'Samsung Galaxy S24 Ultra Branco', false, 'S24 Ultra e smartphone'],
  ['Sony WF-1000XM5', 'Wofro — Alça antiperda para fones de ouvido Sony WF-1000xM5', false, 'alca, nao o fone'],
  ['QCY AilyPods Lite', 'Fone QCY T27 Arcbuds Lite Bluetooth 5.3 Cor Preto', false, 'T27 nao e AilyPods'],
  ['Apple Watch Series 9', 'Apple Watch Series 9 GPS 45mm Aluminum', true, 'mesmo relogio'],
  // cor e medida escrita por extenso nao podem reprovar
  ['Samsung Galaxy Fit3 Rosa Nude', 'Relógio Inteligente Samsung Galaxy Fit3 Amoled 1.6 Rosa', true, 'cor no nome'],
  // Limite conhecido e aceito: "AFO" e um codigo que a ML nao escreve, mas todos os
  // outros sinais batem. Falso negativo e preferivel a trocar por produto errado.
  ['Air Fryer Forno Mondial 12 Litros AFO', 'Fritadeira Air Fryer Forno Oven 12 Litros, Mondial 2000w', false, 'codigo AFO ausente'],
];

const MIN = 0.9;
let pass = 0;
let fail = 0;

for (const [db, ml, expected, note] of CASES) {
  const s = fuzzyScore(db, ml);
  const matched = s >= MIN;
  const ok = matched === expected;
  if (ok) pass++;
  else {
    fail++;
    console.log(
      `FALHOU  ${ok ? '' : ''}${matched ? 'casou' : 'nao casou'} (esperado ${expected ? 'casar' : 'nao casar'}) score=${s.toFixed(2)} | ${note}\n        db="${db}"\n        ml="${ml}"`
    );
  }
  console.log(`${ok ? 'ok   ' : 'FALHA'} ${s.toFixed(2)} ${matched ? 'MATCH' : 'skip '} :: ${note}`);
}

console.log(`\n${pass} passaram, ${fail} falharam de ${CASES.length}`);
console.log(`normalize("iPhone 17 256GB") = "${normalize('iPhone 17 256GB')}"`);

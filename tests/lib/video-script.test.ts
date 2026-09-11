import { describe, it, expect } from 'vitest';
import { assertValidVideoScript } from '@/lib/video-script';

function makeValidScript(): any {
  const narration =
    'Esse controle é baratinho e surpreende na qualidade, com bateria que dura horas e conexão estável sem travar. ';
  return {
    title: 'Controle Barato Vale a Pena? #shorts',
    description: 'Review completo no blog',
    tags: ['comprar', 'vale a pena'],
    hook: 'Cansado de pagar caro?',
    scenes: [
      { narration: `${narration} Cena um com benefício prático de uso diário.`, onScreenText: 'PREÇO BAIXO', durationSec: 9 },
      { narration: `${narration} Cena dois com segundo benefício prático em jogos.`, onScreenText: 'BATERIA LONGA', durationSec: 9 },
      { narration: `${narration} Cena três com prova e nota do review testado.`, onScreenText: 'APROVADO', durationSec: 9 },
      { narration: `${narration} Cena quatro com contra honesto para credibilidade.`, onScreenText: 'PONTO HONESTO', durationSec: 9 },
      { narration: `${narration} Cena cinco com preço e chamada para a descrição.`, onScreenText: 'OFERTA', durationSec: 9 },
    ],
    fullNarration: narration.repeat(5),
    estimatedSeconds: 45,
    cta: 'Link da oferta na descrição',
    priceHighlight: 'R$ 279 (antes R$ 329)',
    offerBadge: 'OFERTA',
    finalCta: 'O link da oferta tá na descrição',
  };
}

describe('assertValidVideoScript', () => {
  it('aceita um roteiro válido sem lançar', () => {
    expect(() => assertValidVideoScript(makeValidScript())).not.toThrow();
  });

  it('rejeita fullNarration curta (<200 chars)', () => {
    const s = makeValidScript();
    s.fullNarration = 'curta demais';
    expect(() => assertValidVideoScript(s)).toThrow();
  });

  it('rejeita fullNarration vazia (caso produção gamesir-nova-lite-2)', () => {
    const s = makeValidScript();
    s.fullNarration = '';
    s.scenes = [];
    expect(() => assertValidVideoScript(s)).toThrow();
  });

  it('rejeita scenes com menos de 3 cenas', () => {
    const s = makeValidScript();
    s.scenes = s.scenes.slice(0, 2);
    expect(() => assertValidVideoScript(s)).toThrow();
  });

  it('rejeita cena sem narration', () => {
    const s = makeValidScript();
    s.scenes[1].narration = '   ';
    expect(() => assertValidVideoScript(s)).toThrow();
  });

  it('rejeita title vazio/blank', () => {
    const s = makeValidScript();
    s.title = '   ';
    expect(() => assertValidVideoScript(s)).toThrow();
  });

  it('rejeita soma durationSec abaixo de 35s', () => {
    const s = makeValidScript();
    s.scenes = s.scenes.map((sc: any) => ({ ...sc, durationSec: 5 }));
    expect(() => assertValidVideoScript(s)).toThrow();
  });

  it('rejeita soma durationSec acima de 70s', () => {
    const s = makeValidScript();
    s.scenes = s.scenes.map((sc: any) => ({ ...sc, durationSec: 20 }));
    expect(() => assertValidVideoScript(s)).toThrow();
  });
});

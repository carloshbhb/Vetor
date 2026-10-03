begin;

create or replace function public.__vetor_close_phase1_text(value text)
returns text
language plpgsql
immutable
set search_path = public, pg_temp
as $$
declare
  out text := coalesce(value, '');
begin
  out := replace(out, 'titânio grau aeroespacial', 'Armor Aluminum');
  out := replace(out, '162,3 x 79,0 x 8,6 mm e 232 gramas', '163,6 x 78,1 x 7,9 mm e 214 gramas');
  out := replace(out, 'Snapdragon 8 Gen 4 for Galaxy', 'Snapdragon 8 Elite Gen 5 for Galaxy');
  out := replace(out, 'Assistente de Circuito', 'Now Nudge');
  out := replace(out, 'O carregador de 65W (vendido separadamente) leva o dispositivo de 0% a 50% em apenas 18 minutos. A 100% em 55 minutos.', 'O Galaxy S26 Ultra é compatível com carregamento de 60 W; a Samsung informa até 75% de carga em cerca de 30 minutos, nas condições indicadas pela fabricante.');
  out := replace(out, '**Teste real de multitarefa:** Abrimos simultaneamente 12 apps pesados: Instagram, YouTube, Netflix, Chrome com 15 abas, dois jogos (Genshin Impact e Call of Duty: Mobile) e o S Pen com anotações. O sistema manteve todos na memória sem recarregar um sequer. A RAM de 12GB LPDDR5X faz esse trabalho com folga. Para efeito de comparação, o iPhone 15 Pro Max com 8GB de RAM já fechou alguns apps em segundo plano em teste semelhante.', '**Multitarefa:** A RAM de 12GB LPDDR5X é dimensionada para cargas com vários aplicativos, mas o comportamento pode variar conforme a memória disponível, os aplicativos abertos e a otimização do sistema.');
  out := replace(out, 'No nosso teste, removemos um carro estacionado indesejado de uma foto de paisagem, e a reconstrução do fundo (calçada e árvore) foi quase perfeita.', 'O Photo Assist pode remover objetos e reconstruir partes da imagem; o resultado varia conforme a cena, a iluminação e a edição aplicada.');
  out := replace(out, 'Mesmo após 45 minutos de Genshin Impact no máximo, a temperatura da traseira não passou de 42°C. O desempenho não sofreu throttling perceptível. Isso é crucial para gamers e usuários pesados que precisam de desempenho consistente durante longas sessões.', 'O sistema de resfriamento por câmara de vapor foi redesenhado para melhorar a dissipação térmica. Temperatura e desempenho sustentado variam conforme jogo, ambiente e configuração.');
  out := replace(out, 'No nosso teste de autonomia real, o dispositivo:

- **Uso misto (8 horas):** Navegação em redes sociais (2 horas), streaming de vídeo (2 horas), 1 hora de jogos (Genshin Impact) e chamadas (1 hora). Terminou o dia com 25% de carga restante.
- **Tela ligada constante (screen-on-time):** Em um dia de uso mais leve (leitura, e-mails, música), atingimos 8 horas e 30 minutos de tela ativa. Isso é impressionante para uma tela QHD+ e 120Hz. Para referência, o Galaxy S24 Ultra atingiu, em média, 7 horas e 40 minutos no mesmo teste.', 'A autonomia efetiva varia conforme uso, rede, brilho, aplicativos e configuração. Como referência, a Samsung informa até 31 horas de reprodução de vídeo e carregamento de até 75% em cerca de 30 minutos, nas condições indicadas pela fabricante.');
  out := replace(out, 'Em um teste em um restaurante escuro, o S26 Ultra capturou os pratos de comida com cores vibrantes, enquanto o iPhone 15 Pro Max entregou uma foto mais escura e granulada.', 'Resultados em baixa luz dependem da cena, iluminação e processamento; compare amostras em condições equivalentes antes de concluir sobre a câmera.');
  out := replace(out, 'A 30x, você pode ler uma placa de rua claramente. A 100x, a imagem fica borrada, mas a IA reconstrói bordas para que seja reconhecível.', 'Em níveis altos de zoom, a qualidade da imagem depende de iluminação, estabilidade e processamento; a ampliação digital pode reduzir a definição.');
  out := replace(out, 'Isso deve prolongar a vida útil da bateria em 20-30% ao longo de 3 anos.', 'O impacto sobre a vida útil da bateria depende do padrão de carregamento e das configurações escolhidas.');
  out := replace(out, 'A vantagem Samsung é clara em otimização de consumo.', 'A autonomia deve ser comparada em condições equivalentes, porque os resultados variam conforme o perfil de uso.');
  out := replace(out, '**Tradução em Tempo Real durante Chamadas:** Você fala em português, a pessoa do outro lado ouve em espanhol (ou outros 13 idiomas). A latência é de menos de 1 recurso para ligações internacionais com familiares ou clientes.', '**Tradução durante chamadas:** o Galaxy AI oferece tradução de chamadas compatíveis em tempo real.');
  out := replace(out, 'Em um teste com cereais espalhados, ele aspirou 98% em um único passo.', 'O resultado com resíduos maiores depende da superfície, do tipo de sujeira e do modo de potência.');
  out := replace(out, '**Performance Nocturna:** Em testes noturnos, o robô manteve o mesmo padrão de limpeza. Os sensores infravermelhos guiam o robô mesmo no escuro, embora a eficiência possa cair levemente em comparação a ambientes iluminados.', '**Performance Nocturna:** Os sensores infravermelhos permitem navegação no escuro, mas o resultado de limpeza pode variar conforme ambiente e obstáculos.');
  out := replace(out, '### **Autonomia Real**', '### **Autonomia e Bateria**');
  out := replace(out, 'até **9 horas** de uso contínuo em testes de laboratório', 'até **9 horas** segundo os dados de referência disponíveis');
  out := replace(out, '**autonomia real de até 9 horas**', '**autonomia citada de até 9 horas**');
  out := replace(out, 'testes de laboratório', 'dados de referência disponíveis');
  return out;
end;
$$;

create or replace function public.__vetor_close_phase1_json(value jsonb)
returns jsonb
language sql
immutable
set search_path = public, pg_temp
as $$
  select case jsonb_typeof(value)
    when 'object' then (
      select coalesce(jsonb_object_agg(k, public.__vetor_close_phase1_json(v)), '{}'::jsonb)
      from jsonb_each(value) as object_item(k, v)
    )
    when 'array' then (
      select coalesce(jsonb_agg(public.__vetor_close_phase1_json(v)), '[]'::jsonb)
      from jsonb_array_elements(value) as array_item(v)
    )
    when 'string' then to_jsonb(public.__vetor_close_phase1_text(value #>> '{}'))
    else value
  end;
$$;

update public.reviews
set
  sections = public.__vetor_close_phase1_json(coalesce(sections, '[]'::jsonb)),
  updated_at = now()
where status = 'published';

update public.reviews
set
  hero_lead = 'Esta análise do Xiaomi Redmi Buds 6 Play reúne os principais recursos, pontos positivos, limitações, concorrentes e critérios para decidir se o modelo faz sentido pelo preço encontrado.',
  meta_description = 'Análise do Xiaomi Redmi Buds 6 Play com recursos, pontos positivos, limitações, concorrentes e critérios para avaliar a compra.',
  price_new = '',
  verdict_text = 'O Xiaomi Redmi Buds 6 Play pode fazer sentido para quem busca um fone TWS de entrada e encontra uma oferta compatível com as próprias prioridades. Confira recursos, limitações e preço atual antes da compra.',
  updated_at = now()
where slug = 'xiaomi-redmi-buds-6-play' and status = 'published';

drop function public.__vetor_close_phase1_json(jsonb);
drop function public.__vetor_close_phase1_text(text);

commit;

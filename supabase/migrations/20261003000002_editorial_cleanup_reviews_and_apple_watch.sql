begin;

create or replace function public.__vetor_normalize_editorial_text(value text)
returns text
language plpgsql
immutable
set search_path = public, pg_temp
as $$
declare
  out text := coalesce(value, '');
begin
  out := regexp_replace(out, 'em nossos testes|nos nossos testes', 'na análise', 'gi');
  out := regexp_replace(out, '\mtestamos\M', 'analisamos', 'gi');
  out := regexp_replace(out, '\mmedimos\M', 'avaliamos', 'gi');
  out := regexp_replace(out, 'benchmark feito por nós|benchmark feito por nos', 'comparação de desempenho', 'gi');
  out := regexp_replace(out, '\mgarantimos\M', 'a informação disponível indica', 'gi');
  out := regexp_replace(out, 'temos um claro vencedor', 'a comparação aponta diferenças claras', 'gi');
  out := regexp_replace(out, 'claro vencedor', 'vantagem mais clara', 'gi');
  out := regexp_replace(out, 'padrão ouro', 'referência na categoria', 'gi');
  out := regexp_replace(out, 'escolha definitiva', 'opção de destaque para esse perfil', 'gi');
  out := regexp_replace(out, 'líder do mercado', 'modelo de destaque no segmento', 'gi');
  out := regexp_replace(out, 'não tem rivais à altura|nao tem rivais a altura', 'oferece integração específica com o iPhone', 'gi');
  out := regexp_replace(out, 'compra certa', 'pode fazer sentido para esse perfil', 'gi');
  out := regexp_replace(out, 'deve ser evitado', 'pode não ser adequado', 'gi');
  out := regexp_replace(out, 'nível médico', 'voltado ao bem-estar, não ao uso médico', 'gi');
  out := regexp_replace(out, 'clinicamente útil', 'útil para acompanhar dados de bem-estar', 'gi');
  out := regexp_replace(out, 'garante visibilidade perfeita', 'favorece a leitura em ambientes claros', 'gi');
  out := regexp_replace(out, 'funcionam sem falhas', 'funcionam de forma consistente quando compatíveis', 'gi');
  out := regexp_replace(out, 'sem engasgos', 'com boa fluidez', 'gi');
  return out;
end;
$$;

create or replace function public.__vetor_normalize_editorial_json(value jsonb)
returns jsonb
language sql
immutable
set search_path = public, pg_temp
as $$
  select case jsonb_typeof(value)
    when 'object' then (
      select coalesce(
        jsonb_object_agg(k, public.__vetor_normalize_editorial_json(v)),
        '{}'::jsonb
      )
      from jsonb_each(value) as object_item(k, v)
    )
    when 'array' then (
      select coalesce(
        jsonb_agg(public.__vetor_normalize_editorial_json(v)),
        '[]'::jsonb
      )
      from jsonb_array_elements(value) as array_item(v)
    )
    when 'string' then to_jsonb(public.__vetor_normalize_editorial_text(value #>> '{}'))
    else value
  end;
$$;

update public.reviews
set
  meta_title = public.__vetor_normalize_editorial_text(meta_title),
  meta_description = public.__vetor_normalize_editorial_text(meta_description),
  hero_lead = public.__vetor_normalize_editorial_text(hero_lead),
  verdict_label = public.__vetor_normalize_editorial_text(verdict_label),
  verdict_text = public.__vetor_normalize_editorial_text(verdict_text),
  verdict_note = public.__vetor_normalize_editorial_text(verdict_note),
  pros = array(
    select public.__vetor_normalize_editorial_text(item)
    from unnest(coalesce(pros, '{}'::text[])) as t(item)
  ),
  cons = array(
    select public.__vetor_normalize_editorial_text(item)
    from unnest(coalesce(cons, '{}'::text[])) as t(item)
  ),
  sections = public.__vetor_normalize_editorial_json(coalesce(sections, '[]'::jsonb)),
  faq = public.__vetor_normalize_editorial_json(coalesce(faq, '[]'::jsonb)),
  compare_table = public.__vetor_normalize_editorial_json(coalesce(compare_table, '{}'::jsonb)),
  updated_at = now()
where status = 'published';

update public.reviews
set
  product = 'Apple Watch Series 9',
  meta_title = 'Apple Watch Series 9 vale a pena? Análise de recursos, preço e limitações',
  meta_description = 'Análise do Apple Watch Series 9, com especificações oficiais, recursos, limitações, compatibilidade com iPhone e pontos para considerar antes da compra.',
  hero_lead = 'O Apple Watch Series 9, lançado em 2023, combina chip S9, gesto de toque duplo, tela de até 2000 nits e integração estreita com o iPhone. Em 2026, sua atratividade depende principalmente do preço, dos recursos desejados e da compatibilidade com o iPhone.',
  verdict_label = 'Recursos avançados com integração ao iPhone',
  verdict_text = 'O Apple Watch Series 9 reúne chip S9, tela de até 2000 nits, 64 GB de capacidade, gesto de toque duplo e recursos de saúde e bem-estar. Ele exige um iPhone compatível, tem autonomia oficial de até 18 horas e pode continuar sendo interessante para quem encontra preço adequado e valoriza a integração ao ecossistema Apple.',
  verdict_note = 'A nota considera recursos, experiência prevista a partir das especificações e relação entre preço consultado e proposta do produto. Confirme compatibilidade, disponibilidade de recursos e preço antes da compra.',
  pros = array[
    'Chip S9 SiP com Siri que pode processar determinadas solicitações no próprio dispositivo',
    'Tela Retina LTPO OLED com brilho máximo de até 2000 nits e mínimo de 1 nit',
    '64 GB de capacidade para apps e conteúdo compatível',
    'Gesto de toque duplo para controlar determinadas ações sem tocar na tela',
    'Conjunto amplo de recursos de saúde e bem-estar, com disponibilidade sujeita a modelo, região e configuração'
  ],
  cons = array[
    'Autonomia oficial de até 18 horas em uso normal e até 36 horas no modo de Pouca Energia',
    'Requer iPhone XS ou posterior com iOS 17 ou posterior para compatibilidade com o Series 9',
    'Recursos e disponibilidade podem variar conforme país, região, versão e configuração do relógio',
    'As mudanças visuais em relação a gerações anteriores são incrementais',
    'Alguns recursos de saúde, como ECG e oxigênio no sangue, possuem limitações de uso e disponibilidade'
  ],
  faq = $$[
    {"question":"O Apple Watch Series 9 funciona com Android?","answer":"Não. A Apple informa compatibilidade com iPhone XS ou posterior com iOS 17 ou posterior. O Series 9 não é apresentado pela fabricante como compatível com celulares Android."},
    {"question":"Qual é a autonomia do Apple Watch Series 9?","answer":"A Apple informa até 18 horas de uso normal e até 36 horas no modo de Pouca Energia. O resultado real depende do uso, da configuração e de recursos ativados."},
    {"question":"O Apple Watch Series 9 tem ECG e oxigênio no sangue?","answer":"O Series 9 inclui os recursos de ECG e Oxigênio no Sangue, mas a disponibilidade pode variar por país, região e modelo. A Apple também informa que o recurso de Oxigênio no Sangue é voltado ao bem-estar e não deve ser usado para fins médicos."}
  ]$$::jsonb,
  sections = $$[
    {
      "id":"visao-geral",
      "heading":"Visão Geral e Posicionamento no Mercado",
      "tocEmoji":"🔍",
      "tocLabel":"Visão Geral",
      "content":"O Apple Watch Series 9 foi lançado em 2023 e ocupa uma faixa premium dentro da linha de relógios da Apple. A proposta combina monitoramento de atividades, notificações, aplicativos, pagamentos e integração com o iPhone em um único dispositivo. Em 2026, a avaliação de compra precisa considerar principalmente o preço encontrado e a diferença de recursos em relação a modelos mais recentes ou mais simples.\n\nO destaque de hardware é o S9 SiP, com processador de dois núcleos de 64 bits e Neural Engine de quatro núcleos. A Apple também informa 64 GB de capacidade. O conjunto permite recursos como Siri com processamento no dispositivo para determinadas solicitações e o gesto de toque duplo.\n\nA tela é Retina LTPO OLED sempre ativa, com brilho máximo de até 2000 nits e mínimo de 1 nit. A ficha oficial também registra opções de caixa de 41 mm e 45 mm, com versões em alumínio e aço inoxidável.\n\nEm vez de depender apenas da idade do produto, vale comparar o Series 9 pelo conjunto de recursos, compatibilidade, autonomia e preço no momento da compra."
    },
    {
      "id":"design-construcao",
      "heading":"Design, Acabamento e Conforto no Uso Contínuo",
      "tocEmoji":"⌚",
      "tocLabel":"Design e Conforto",
      "content":"O Series 9 mantém a linguagem visual característica do Apple Watch, com caixa disponível em 41 mm e 45 mm. Nas versões de alumínio, o peso é menor; nas versões de aço inoxidável, o relógio é mais pesado. A escolha pode ser feita considerando tamanho, peso e preferência de acabamento.\n\nA Apple lista caixas de alumínio em rosa, meia-noite, estelar, prateado e PRODUCT(RED), além de opções em aço inoxidável. A tela usa vidro Ion-X nas caixas de alumínio e cristal de safira nas caixas de aço inoxidável.\n\nNa parte traseira, o relógio reúne os sensores cardíacos e outros componentes necessários ao acompanhamento de saúde e atividade. O ajuste da pulseira influencia o contato com a pele e a qualidade das medições, segundo as orientações da própria Apple.\n\nA resistência à água é indicada pela fabricante para natação e outras situações compatíveis com a classificação do dispositivo. Isso não significa que qualquer tipo de mergulho ou atividade aquática seja apropriado."
    },
    {
      "id":"desempenho-pratica",
      "heading":"Desempenho e Recursos do S9",
      "tocEmoji":"⚡",
      "tocLabel":"Desempenho",
      "content":"O S9 SiP é um dos principais diferenciais do Series 9. A Apple descreve um processador de dois núcleos de 64 bits e um Neural Engine de quatro núcleos, além de processamento no dispositivo para determinadas solicitações da Siri.\n\nO gesto de toque duplo também depende do processamento do S9. Ele pode controlar a ação principal de determinados aplicativos, atender ou encerrar uma chamada, iniciar ou pausar mídia, adiar um alarme e executar outras funções compatíveis.\n\nOutro recurso é o chip de banda ultralarga de segunda geração, usado em conjunto com dispositivos compatíveis para ajudar na localização de objetos e aparelhos dentro do ecossistema Apple.\n\nComo o produto é de 2023, a percepção de desempenho precisa ser lida junto com o suporte de software disponível e com as necessidades atuais do comprador, em vez de assumir que ele é automaticamente a opção mais rápida entre todas as gerações."
    },
    {
      "id":"experiencia-dia-a-dia",
      "heading":"Experiência de Uso no Cotidiano",
      "tocEmoji":"🇧🇷",
      "tocLabel":"Uso Diário",
      "content":"A integração com o iPhone é central para a proposta do Series 9. A Apple exige iPhone XS ou posterior com iOS 17 ou posterior para compatibilidade, portanto o aparelho não atende quem usa exclusivamente Android.\n\nO Apple Pay permite usar cartões compatíveis no relógio, enquanto notificações, mensagens e aplicativos ampliam o uso além de atividades físicas. A disponibilidade de recursos pode variar conforme região, configuração e aplicativo instalado.\n\nA tela de até 2000 nits favorece a leitura em ambientes muito claros, enquanto o brilho mínimo de 1 nit ajuda em situações de pouca luz. Ainda assim, a leitura real depende de condições externas e do conteúdo exibido.\n\nOs recursos de saúde e bem-estar incluem ECG, notificações relacionadas à frequência cardíaca e outros recursos de acompanhamento. A Apple ressalta que determinados recursos não são destinados a uso médico."
    },
    {
      "id":"bateria-ou-recurso-chave",
      "heading":"Bateria, Autonomia e Sistema de Recarga",
      "tocEmoji":"🔋",
      "tocLabel":"Bateria",
      "content":"A Apple informa até 18 horas de autonomia para uso normal e até 36 horas com o modo de Pouca Energia ativado. Esses números são condições de referência da fabricante, não uma medição realizada pelo Vetor.blog.\n\nA duração efetiva pode variar conforme notificações, treino, chamadas, conectividade, brilho da tela e outros recursos usados ao longo do dia. Para quem acompanha o sono, a rotina de recarga precisa entrar no planejamento de uso.\n\nO Series 9 é compatível com recarga rápida. A Apple informa que é possível atingir até 80% de carga em aproximadamente 45 minutos, nas condições especificadas pela fabricante.\n\nEm uma decisão de compra, a autonomia deve ser comparada com a de outros modelos e com a rotina pretendida, especialmente para quem prioriza longos períodos longe da tomada."
    },
    {
      "id":"conectividade-software",
      "heading":"Conectividade, Aplicativo e Ecossistema",
      "tocEmoji":"🌐",
      "tocLabel":"Conectividade",
      "content":"O Series 9 oferece Bluetooth, Wi-Fi, GPS e versões com conectividade celular. A disponibilidade de funções depende do modelo, da configuração e da operadora.\n\nO relógio trabalha em conjunto com o iPhone para organizar aplicativos, notificações e dados de saúde. O watchOS também oferece aplicativos próprios e recursos para exercícios, comunicação e pagamentos.\n\nA Apple lista compatibilidade com diversos sistemas de posicionamento por satélite, além de recursos de conexão com acessórios Bluetooth para atividades como ciclismo.\n\nComo o ecossistema é um dos motivos para escolher o produto, o usuário deve considerar também o aparelho que já possui e os serviços que pretende usar antes da compra."
    },
    {
      "id":"comparativo-concorrentes",
      "heading":"Análise Comparativa com Concorrentes Diretos",
      "tocEmoji":"⚖️",
      "tocLabel":"Comparativo",
      "content":"O Apple Watch Series 9 pode ser comparado ao Apple Watch SE e a smartwatches de outras marcas, mas a compatibilidade com iPhone muda o contexto da decisão. O SE atende a uma proposta mais simples dentro do ecossistema Apple, enquanto o Series 9 adiciona tela sempre ativa e outros recursos.\n\nEm relação a modelos Android, o critério principal é a compatibilidade do smartphone. Usuários de iPhone devem comparar recursos, autonomia e preço; usuários de Android precisam considerar alternativas compatíveis com seu aparelho.\n\nRelógios esportivos especializados normalmente enfatizam autonomia, treino e métricas esportivas. O Series 9 enfatiza integração com o iPhone, aplicativos, notificações e recursos de saúde e bem-estar.\n\nAssim, não existe uma única resposta válida para todos os compradores: o peso de cada critério depende do ecossistema e da rotina de uso."
    },
    {
      "id":"mercado-brasil-custo-beneficio",
      "heading":"Preço, Disponibilidade e Custo-Benefício no Brasil",
      "tocEmoji":"💰",
      "tocLabel":"Preço e Mercado",
      "content":"O preço de referência registrado nesta página é o valor consultado na atualização do review. Esse número pode mudar por loja, promoção, tamanho, acabamento, conectividade e condição do produto.\n\nAo comparar o Series 9, vale considerar o que vem incluído no modelo encontrado e quais recursos são realmente importantes para a rotina. Um preço mais baixo pode mudar a relação entre recursos e custo, enquanto uma versão mais cara pode acrescentar conectividade ou acabamento.\n\nTambém é importante observar a procedência da oferta, a garantia aplicável e as condições informadas pelo vendedor. O usuário deve confirmar o preço final antes da compra.\n\nA decisão fica mais clara quando o Series 9 é comparado com modelos atuais da própria Apple e com alternativas compatíveis com o smartphone do comprador."
    },
    {
      "id":"para-quem-vale-a-pena",
      "heading":"Perfil de Compra: Para Quem Vale a Pena e Quem Deve Evitar",
      "tocEmoji":"🎯",
      "tocLabel":"Perfil de Compra",
      "content":"O Series 9 pode fazer sentido para quem já usa iPhone compatível e procura um smartwatch com tela sempre ativa, recursos de saúde e integração ampla com o ecossistema Apple. O gesto de toque duplo e o processamento do S9 também podem ser critérios relevantes.\n\nQuem usa Android não consegue aproveitar o relógio como dispositivo compatível com seu smartphone, então esse perfil deve procurar um modelo adequado ao próprio ecossistema.\n\nQuem prioriza vários dias de autonomia também deve comparar cuidadosamente o Series 9 com modelos voltados a maior duração de bateria. A autonomia oficial de até 18 horas é um critério importante para esse público.\n\nPara quem já possui um Apple Watch mais recente, a comparação precisa considerar quais recursos adicionais realmente justificariam a troca, em vez de olhar apenas para a geração do produto."
    },
    {
      "id":"veredito-final-analise",
      "heading":"Veredito e Considerações Finais",
      "tocEmoji":"📌",
      "tocLabel":"Veredito Final",
      "content":"O Apple Watch Series 9 continua reunindo um conjunto amplo de recursos em um formato compacto: S9 SiP, tela de até 2000 nits, 64 GB, gesto de toque duplo, recursos de saúde e integração com o iPhone. Esses pontos ajudam a explicar por que ele ainda aparece em comparações de compra mesmo sendo uma geração lançada em 2023.\n\nPor outro lado, a autonomia oficial de até 18 horas, a exigência de um iPhone compatível e a existência de modelos mais novos precisam entrar na conta. O preço consultado também pode mudar bastante o custo-benefício.\n\nA melhor forma de avaliar o Series 9 é cruzar esses fatores com a rotina, o ecossistema e o valor encontrado no dia da compra. Recursos de saúde devem ser entendidos como ferramentas de bem-estar, respeitando as limitações indicadas pela fabricante.\n\nPara decidir, confira a compatibilidade, as condições da oferta e quais recursos da geração atendem de fato ao uso pretendido."
    }
  ]$$::jsonb,
  updated_at = now()
where slug = 'apple-watch-series-9';

drop function public.__vetor_normalize_editorial_json(jsonb);
drop function public.__vetor_normalize_editorial_text(text);

commit;
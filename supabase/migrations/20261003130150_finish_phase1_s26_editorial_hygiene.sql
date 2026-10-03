begin;

create or replace function public.__vetor_phase1_finish_text(value text)
returns text
language plpgsql
immutable
set search_path = public, pg_temp
as $$
declare
  out text := coalesce(value, '');
begin
  out := replace(out, 'A moldura de titânio é resistente a arranhões', 'A moldura de Armor Aluminum é resistente ao desgaste');
  out := replace(out, 'Snapdragon 8 Gen 4', 'Snapdragon 8 Elite Gen 5');
  out := replace(out, 'A 30x, você pode ler uma placa de rua claramente. A 100x, a imagem fica borrada, mas a IA reconstrói bordas para que seja reconhecível.', 'Em níveis altos de zoom, a qualidade da imagem depende de iluminação, estabilidade e processamento; a ampliação digital pode reduzir a definição.');
  out := replace(out, 'Estima-se que após 18 meses, o S26 Ultra mantenha cerca de 65% do seu preço de compra. Isso é melhor que muitos concorrentes Android, que costumam despencar de valor.', 'O valor de revenda depende de conservação, demanda, versão, tempo de uso e preço praticado no mercado de usados.');
  out := replace(out, 'Se você usa o celular apenas para redes sociais, ligar e usar WhatsApp, um smartphone intermediário como o Galaxy A55 ou o Galaxy S24 FE entrega 80% dessa experiência por 40% do preço. A tela será ótima, a câmera boa, e a bateria durará o dia.', 'Quem usa o celular principalmente para mensagens, redes sociais e tarefas básicas pode encontrar alternativas intermediárias mais adequadas ao orçamento.');
  out := replace(out, 'Não precisará de upgrade em 2 anos como com smartphones intermediários.', 'A duração adequada do aparelho depende do desempenho exigido e do suporte de software disponível.');
  out := replace(out, '> 💡 **Segredo Técnico:** A câmera principal usa um sensor ISOCELL HP2 com pixels agrupados em 2.4μm. Isso permite captar mais luz em ambientes escuros, resultando em fotos noturnas mais limpas.', '> 💡 **Nota técnica:** A câmera principal de 200 MP possui abertura ampla para favorecer a entrada de luz. O resultado em baixa luz depende da cena e do processamento.');
  out := replace(out, 'É um smartphone para quem leva tecnologia a sério.', 'A decisão deve considerar o uso pretendido, os recursos relevantes e o preço encontrado.');
  return out;
end;
$$;

create or replace function public.__vetor_phase1_finish_json(value jsonb)
returns jsonb
language sql
immutable
set search_path = public, pg_temp
as $$
  select case jsonb_typeof(value)
    when 'object' then (
      select coalesce(jsonb_object_agg(k, public.__vetor_phase1_finish_json(v)), '{}'::jsonb)
      from jsonb_each(value) as object_item(k, v)
    )
    when 'array' then (
      select coalesce(jsonb_agg(public.__vetor_phase1_finish_json(v)), '[]'::jsonb)
      from jsonb_array_elements(value) as array_item(v)
    )
    when 'string' then to_jsonb(public.__vetor_phase1_finish_text(value #>> '{}'))
    else value
  end;
$$;

update public.reviews
set
  sections = public.__vetor_phase1_finish_json(coalesce(sections, '[]'::jsonb)),
  updated_at = now()
where slug = 'samsung-galaxy-s26-ultra' and status = 'published';

drop function public.__vetor_phase1_finish_json(jsonb);
drop function public.__vetor_phase1_finish_text(text);

commit;

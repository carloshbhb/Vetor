begin;

update public.reviews
set sections = (
  select coalesce(
    jsonb_agg(
      case
        when elem->>'id' = 'caminera-sensores' then
          jsonb_set(
            elem,
            '{content}',
            to_jsonb(
              replace(
                elem->>'content',
                'A 30x, você pode ler uma placa de rua claramente. A 100x, a imagem fica borrada, mas a IA reconstrói bordas para que seja reconhecível.',
                'Em níveis altos de zoom, a qualidade da imagem depende de iluminação, estabilidade e processamento; a ampliação digital pode reduzir a definição.'
              )
            )
          )
        else elem
      end
      order by ord
    ),
    '[]'::jsonb
  )
  from jsonb_array_elements(coalesce(sections, '[]'::jsonb)) with ordinality as x(elem, ord)
)
where slug = 'samsung-galaxy-s26-ultra' and status = 'published';

update public.reviews
set sections = (
  select coalesce(
    jsonb_agg(
      case
        when elem->>'id' = 'caminera-sensores' then
          jsonb_set(
            elem,
            '{content}',
            to_jsonb(
              replace(
                elem->>'content',
                'O zoom digital de até 100x ("Space Zoom") é mais uma curiosidade técnica do que um recurso prático, mas a IA faz um trabalho decente até 30x.',
                'O zoom digital de até 100x amplia a cena, mas a qualidade depende de iluminação, estabilidade e processamento de imagem.'
              )
            )
          )
        when elem->>'id' = 'performance-recursos' then
          jsonb_set(
            elem,
            '{content}',
            to_jsonb(
              replace(
                elem->>'content',
                'O sistema de resfriamento por vapor ocupa 40% mais área interna.',
                'A arquitetura térmica foi redesenhada, com uma câmara de vapor maior para ajudar no desempenho sustentado.'
              )
            )
          )
        when elem->>'id' = 'design-ergonomia' then
          jsonb_set(
            elem,
            '{content}',
            to_jsonb(
              replace(
                elem->>'content',
                'A construção combina Armor Aluminum com a nova proteção Gorilla Armor 2, que reduz reflexos em até 75%.',
                'A construção combina Armor Aluminum com Gorilla Armor 2, que inclui tecnologia antirreflexo.'
              )
            )
          )
        else elem
      end
      order by ord
    ),
    '[]'::jsonb
  )
  from jsonb_array_elements(coalesce(sections, '[]'::jsonb)) with ordinality as x(elem, ord)
)
where slug = 'samsung-galaxy-s26-ultra' and status = 'published';

commit;

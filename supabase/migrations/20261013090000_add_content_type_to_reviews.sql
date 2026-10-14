alter table public.reviews
  add column if not exists content_type text not null default 'review';

alter table public.reviews
  drop constraint if exists reviews_content_type_check;

alter table public.reviews
  add constraint reviews_content_type_check
  check (content_type in ('review', 'lp'));

insert into public.reviews
select (
  jsonb_populate_record(
    null::public.reviews,
    to_jsonb(source) || jsonb_build_object(
      'id', gen_random_uuid(),
      'slug', target.slug,
      'content_type', 'lp',
      'meta_title', target.meta_title,
      'meta_description', target.meta_description,
      'meta_canonical', 'https://www.vetor.blog/reviews/' || target.slug || '/',
      'created_at', now(),
      'updated_at', now()
    )
  )
).*
from public.reviews source
cross join (values
  ('8bitdo-ultimate-2c','8bitdo-ultimate-2c-controle-gamepad','8BitDo Ultimate 2C: ofertas e onde comprar | Vetor.blog','Confira a oferta do Controle 8BitDo Ultimate 2C e compare as condições de compra.'),
  ('xiaomi-mi-home-security-camera-2k-cam-seg','review-camera-xiaomi-mi-home-security-2k','Xiaomi Mi Home Security Camera 2K: ofertas e onde comprar | Vetor.blog','Compare a oferta da Xiaomi Mi Home Security Camera 2K e confira os pontos a verificar antes da compra.')
) as target(slug, source_slug, meta_title, meta_description)
where source.slug = target.source_slug
on conflict (slug) do update set
  content_type = 'lp',
  meta_title = excluded.meta_title,
  meta_description = excluded.meta_description,
  meta_canonical = excluded.meta_canonical,
  updated_at = now();

create index if not exists reviews_content_type_status_idx
  on public.reviews (content_type, status, updated_at desc);

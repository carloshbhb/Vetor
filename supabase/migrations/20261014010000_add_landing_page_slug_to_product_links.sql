alter table public.product_links
  add column if not exists landing_page_slug text;

create unique index if not exists product_links_landing_page_slug_uidx
  on public.product_links (landing_page_slug)
  where landing_page_slug is not null;

comment on column public.product_links.landing_page_slug is
  'Slug de uma landing page de produto; separado de review_slug, que referencia o review editorial.';

update public.product_links
set landing_page_slug = '8bitdo-ultimate-2c'
where slug = '8bitdo-ultimate-2c-controle-gamepad'
  and landing_page_slug is null;

update public.product_links
set landing_page_slug = 'xiaomi-mi-home-security-camera-2k-cam-seg'
where product_name = 'Xiaomi Mi Home Security Camera 2K'
  and landing_page_slug is null;

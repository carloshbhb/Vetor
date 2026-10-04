alter table public.affiliate_links
  add column if not exists product_url text not null default '',
  add column if not exists affiliate_tag text not null default '',
  add column if not exists affiliate_checked_at timestamptz,
  add column if not exists image_url text not null default '',
  add column if not exists price numeric(12, 2);

comment on column public.affiliate_links.product_url is
  'URL canônica do produto consultada no catálogo do marketplace; separada do destino afiliado.';
comment on column public.affiliate_links.affiliate_tag is
  'Etiqueta de campanha registrada na Central de Afiliados do marketplace.';
comment on column public.affiliate_links.affiliate_checked_at is
  'Última conferência manual do destino afiliado.';

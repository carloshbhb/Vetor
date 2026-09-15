create extension if not exists "uuid-ossp";

create table product_links (
  id uuid primary key default uuid_generate_v4(),
  slug text unique not null,
  product_name text not null,
  category text not null,
  product_url text not null,
  affiliate_url text,
  image_url text,
  marketplace text default 'mercadolivre' check (marketplace in ('mercadolivre', 'amazon', 'multi')),
  status text default 'active' check (status in ('active', 'pending', 'reviewed', 'video_generated', 'archived')),
  source text default 'manual' check (source in ('manual', 'websearch', 'scraped', 'api')),
  has_review boolean default false,
  has_video boolean default false,
  review_slug text,
  video_id text,
  price text,
  score numeric,
  priority integer default 0,
  notes text,
  tags text[],
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

alter table product_links enable row level security;

create policy "Authenticated users can do anything"
  on product_links
  for all
  using (auth.role() = 'authenticated');

create policy "Anonymous users can read"
  on product_links
  for select
  using (true);

create index idx_product_links_category on product_links (category);
create index idx_product_links_status on product_links (status);
create index idx_product_links_has_review on product_links (has_review);
create index idx_product_links_has_video on product_links (has_video);

create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger product_links_updated_at
  before update on product_links
  for each row
  execute function update_updated_at();

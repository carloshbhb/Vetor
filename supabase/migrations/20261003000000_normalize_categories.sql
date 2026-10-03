-- Vetor.blog: normalize legacy category labels in persisted content.
-- Idempotent and safe to run more than once.

begin;

update reviews
set category = case lower(trim(category))
  when 'eletroportateis' then 'Eletroportáteis'
  when 'eletroportáteis' then 'Eletroportáteis'
  when 'wearables' then 'Wearables / Smartbands'
  when 'wearables / smartbands' then 'Wearables / Smartbands'
  when 'acessorios gamer' then 'Acessórios para Games'
  when 'acessórios gamer' then 'Acessórios para Games'
  when 'acessórios para games' then 'Acessórios para Games'
  when 'mercado livre frete gratis' then 'Mercado Livre Frete Grátis'
  when 'mercado livre frete grátis' then 'Mercado Livre Frete Grátis'
  else trim(category)
end
where category is not null;

update viral_articles
set category = case lower(trim(category))
  when 'eletroportateis' then 'Eletroportáteis'
  when 'eletroportáteis' then 'Eletroportáteis'
  when 'wearables' then 'Wearables / Smartbands'
  when 'wearables / smartbands' then 'Wearables / Smartbands'
  when 'acessorios gamer' then 'Acessórios para Games'
  when 'acessórios gamer' then 'Acessórios para Games'
  when 'acessórios para games' then 'Acessórios para Games'
  when 'mercado livre frete gratis' then 'Mercado Livre Frete Grátis'
  when 'mercado livre frete grátis' then 'Mercado Livre Frete Grátis'
  else trim(category)
end
where category is not null;

update product_links
set category = case lower(trim(category))
  when 'eletroportateis' then 'Eletroportáteis'
  when 'eletroportáteis' then 'Eletroportáteis'
  when 'wearables' then 'Wearables / Smartbands'
  when 'wearables / smartbands' then 'Wearables / Smartbands'
  when 'acessorios gamer' then 'Acessórios para Games'
  when 'acessórios gamer' then 'Acessórios para Games'
  when 'acessórios para games' then 'Acessórios para Games'
  when 'mercado livre frete gratis' then 'Mercado Livre Frete Grátis'
  when 'mercado livre frete grátis' then 'Mercado Livre Frete Grátis'
  else trim(category)
end
where category is not null;

commit;

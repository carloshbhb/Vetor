alter table public.reviews
  add column if not exists availability text;

alter table public.reviews
  drop constraint if exists reviews_availability_check;

alter table public.reviews
  add constraint reviews_availability_check
  check (
    availability is null
    or availability in (
      'https://schema.org/BackOrder',
      'https://schema.org/Discontinued',
      'https://schema.org/InStock',
      'https://schema.org/InStoreOnly',
      'https://schema.org/LimitedAvailability',
      'https://schema.org/OnlineOnly',
      'https://schema.org/OutOfStock',
      'https://schema.org/PreOrder',
      'https://schema.org/PreSale',
      'https://schema.org/SoldOut'
    )
  );

comment on column public.reviews.availability is
  'Availability for schema.org Offer, populated only after current seller stock is verified; NULL means unknown.';

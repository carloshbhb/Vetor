-- Add covering indexes for the nullable product and central affiliate link references.
CREATE INDEX IF NOT EXISTS affiliate_sales_product_link_id_idx
  ON public.affiliate_sales(product_link_id)
  WHERE product_link_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS affiliate_sales_affiliate_link_id_idx
  ON public.affiliate_sales(affiliate_link_id)
  WHERE affiliate_link_id IS NOT NULL;

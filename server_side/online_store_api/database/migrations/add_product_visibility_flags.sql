-- Add visibility flags to products
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT FALSE;

-- Backfill NULLs to defaults (for older rows)
UPDATE public.products
SET
  is_hidden = COALESCE(is_hidden, FALSE),
  is_archived = COALESCE(is_archived, FALSE)
WHERE TRUE;

-- Helpful indexes if filtering server-side later
CREATE INDEX IF NOT EXISTS idx_products_is_hidden ON public.products(is_hidden);
CREATE INDEX IF NOT EXISTS idx_products_is_archived ON public.products(is_archived);



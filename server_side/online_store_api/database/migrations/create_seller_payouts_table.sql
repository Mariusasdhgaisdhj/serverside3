-- Migration: Create seller_payouts table
-- This table tracks payouts to sellers for their completed orders

CREATE TABLE IF NOT EXISTS public.seller_payouts (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  seller_id uuid NOT NULL,
  order_id uuid,
  amount numeric NOT NULL,
  fee numeric DEFAULT 0,
  net_amount numeric NOT NULL,
  payment_method character varying NOT NULL,
  payout_method character varying,
  transaction_reference character varying,
  status character varying DEFAULT 'pending' CHECK (
    status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')
  ),
  payout_info jsonb,
  processed_by uuid,
  processed_at timestamp with time zone,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT seller_payouts_pkey PRIMARY KEY (id),
  CONSTRAINT seller_payouts_seller_id_fkey FOREIGN KEY (seller_id) REFERENCES public.users(id),
  CONSTRAINT seller_payouts_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id),
  CONSTRAINT seller_payouts_processed_by_fkey FOREIGN KEY (processed_by) REFERENCES public.users(id)
);

-- Add comment
COMMENT ON TABLE public.seller_payouts IS 'Tracks payouts to sellers for completed orders';
COMMENT ON COLUMN public.seller_payouts.payout_method IS 'Method used to payout: gcash, bank_transfer, paypal, etc.';
COMMENT ON COLUMN public.seller_payouts.payout_info IS 'Information needed for payout (GCash number, account details, etc.)';

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_seller_payouts_seller_id ON public.seller_payouts(seller_id);
CREATE INDEX IF NOT EXISTS idx_seller_payouts_status ON public.seller_payouts(status);
CREATE INDEX IF NOT EXISTS idx_seller_payouts_created_at ON public.seller_payouts(created_at);


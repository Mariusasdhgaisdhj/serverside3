-- Create PayMongo integration tables

-- Table to store PayMongo sources (GCash authorization)
CREATE TABLE public.paymongo_sources (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  source_id character varying NOT NULL UNIQUE, -- PayMongo source ID
  amount numeric NOT NULL,
  currency character varying NOT NULL DEFAULT 'PHP',
  description text,
  type character varying NOT NULL DEFAULT 'gcash', -- 'gcash', 'grab_pay'
  status character varying NOT NULL DEFAULT 'pending' CHECK (status::text = ANY (ARRAY['pending'::character varying, 'chargeable'::character varying, 'consumed'::character varying, 'failed'::character varying]::text[])),
  checkout_url text,
  success_url text,
  failed_url text,
  payment_id character varying, -- PayMongo payment ID after successful charge
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT paymongo_sources_pkey PRIMARY KEY (id)
);

-- Table to store PayMongo payout requests
CREATE TABLE public.paymongo_payouts (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  seller_id uuid NOT NULL,
  source_id character varying NOT NULL, -- References paymongo_sources.source_id
  amount numeric NOT NULL,
  gcash_number character varying NOT NULL,
  gcash_name character varying NOT NULL,
  description text,
  status character varying NOT NULL DEFAULT 'pending_authorization' CHECK (status::text = ANY (ARRAY['pending_authorization'::character varying, 'authorized'::character varying, 'completed'::character varying, 'failed'::character varying]::text[])),
  payment_id character varying, -- PayMongo payment ID after successful completion
  error_message text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  completed_at timestamp with time zone,
  CONSTRAINT paymongo_payouts_pkey PRIMARY KEY (id),
  CONSTRAINT paymongo_payouts_seller_id_fkey FOREIGN KEY (seller_id) REFERENCES public.users(id),
  CONSTRAINT paymongo_payouts_source_id_fkey FOREIGN KEY (source_id) REFERENCES public.paymongo_sources(source_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_paymongo_sources_status ON public.paymongo_sources(status);
CREATE INDEX IF NOT EXISTS idx_paymongo_sources_created_at ON public.paymongo_sources(created_at);
CREATE INDEX IF NOT EXISTS idx_paymongo_payouts_seller_id ON public.paymongo_payouts(seller_id);
CREATE INDEX IF NOT EXISTS idx_paymongo_payouts_status ON public.paymongo_payouts(status);
CREATE INDEX IF NOT EXISTS idx_paymongo_payouts_created_at ON public.paymongo_payouts(created_at);

-- Add comments
COMMENT ON TABLE public.paymongo_sources IS 'Stores PayMongo source objects for GCash payment authorization';
COMMENT ON TABLE public.paymongo_payouts IS 'Stores PayMongo payout requests and their status';
COMMENT ON COLUMN public.paymongo_sources.source_id IS 'PayMongo source ID from their API';
COMMENT ON COLUMN public.paymongo_sources.checkout_url IS 'URL where seller authorizes the payment';
COMMENT ON COLUMN public.paymongo_payouts.status IS 'Current status of the payout request';
COMMENT ON COLUMN public.paymongo_payouts.payment_id IS 'PayMongo payment ID after successful completion';

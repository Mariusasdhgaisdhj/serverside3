-- Add suspension fields to users table
-- This migration adds fields to track user account suspension status

-- Add suspended boolean field (defaults to false)
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS suspended boolean DEFAULT false;

-- Add suspension reason field
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS suspension_reason text;

-- Add suspended_at timestamp field
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS suspended_at timestamp with time zone;

-- Add index for suspended field for better query performance
CREATE INDEX IF NOT EXISTS idx_users_suspended ON public.users(suspended);

-- Add index for suspended_at field for better query performance
CREATE INDEX IF NOT EXISTS idx_users_suspended_at ON public.users(suspended_at);

-- Add comment to document the new fields
COMMENT ON COLUMN public.users.suspended IS 'Indicates if the user account is suspended';
COMMENT ON COLUMN public.users.suspension_reason IS 'Reason for account suspension';
COMMENT ON COLUMN public.users.suspended_at IS 'Timestamp when the account was suspended';

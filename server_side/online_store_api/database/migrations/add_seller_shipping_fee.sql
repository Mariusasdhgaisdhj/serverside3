-- Migration: Add shipping fee field for sellers
-- This migration adds the shipping_fee field to the users table for sellers to set their own shipping costs

-- Add shipping_fee column
ALTER TABLE users ADD COLUMN IF NOT EXISTS shipping_fee DECIMAL(10,2);

-- Add comment to document the shipping_fee field
COMMENT ON COLUMN users.shipping_fee IS 'Shipping fee set by seller (NULL means free shipping)';

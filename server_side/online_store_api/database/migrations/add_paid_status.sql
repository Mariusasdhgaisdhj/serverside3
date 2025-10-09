-- Migration: Add 'paid' status to order_status constraint and reference_number column
-- This migration updates the CHECK constraint to allow 'paid' as a valid order status
-- and adds the reference_number column for GCash payments

-- Drop the existing constraint
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_order_status_check;

-- Add the new constraint with 'paid' status included
ALTER TABLE orders ADD CONSTRAINT orders_order_status_check 
CHECK (order_status IN ('pending', 'processing', 'paid', 'shipped', 'delivered', 'cancelled'));

-- Add reference_number column
ALTER TABLE orders ADD COLUMN IF NOT EXISTS reference_number VARCHAR(100);

-- Update any existing 'processing' orders that should be 'paid' based on payment method
-- This is optional - you can run this if you want to update existing data
-- UPDATE orders 
-- SET order_status = 'paid' 
-- WHERE order_status = 'processing' 
-- AND payment_method IN ('gcash', 'paypal');

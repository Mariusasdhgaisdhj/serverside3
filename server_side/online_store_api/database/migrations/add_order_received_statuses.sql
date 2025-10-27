-- Migration: Add 'to_receive', 'completed', and 'out_for_delivery' statuses to order_status constraint
-- This migration updates the CHECK constraint to support the Shopee-style "Order Received" feature

-- Drop the existing constraint
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_order_status_check;

-- Add the new constraint with additional statuses
ALTER TABLE orders ADD CONSTRAINT orders_order_status_check 
CHECK (order_status IN (
    'pending', 
    'processing', 
    'paid', 
    'shipped', 
    'out_for_delivery',
    'to_receive',
    'delivered', 
    'completed',
    'cancelled'
));

-- Add comment explaining the new statuses
COMMENT ON CONSTRAINT orders_order_status_check ON orders IS 
'Order status values: pending, processing, paid, shipped, out_for_delivery, to_receive (awaiting buyer confirmation), delivered, completed (buyer confirmed), cancelled';


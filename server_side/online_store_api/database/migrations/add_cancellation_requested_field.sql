-- Migration: Add cancellation_requested field to orders table
-- This field will track when a buyer has requested cancellation but seller hasn't approved yet

-- Add cancellation_requested column
ALTER TABLE orders ADD COLUMN IF NOT EXISTS cancellation_requested BOOLEAN DEFAULT FALSE;

-- Add cancellation_reason column to store the buyer's reason
ALTER TABLE orders ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;

-- Add cancellation_requested_at timestamp
ALTER TABLE orders ADD COLUMN IF NOT EXISTS cancellation_requested_at TIMESTAMP WITH TIME ZONE;

-- Add index for efficient querying of cancellation requests
CREATE INDEX IF NOT EXISTS idx_orders_cancellation_requested ON orders(cancellation_requested) WHERE cancellation_requested = TRUE;

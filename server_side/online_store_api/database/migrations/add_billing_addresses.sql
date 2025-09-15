-- Migration: Add billing_addresses table
-- Description: Adds support for billing addresses in orders
-- Date: 2024

-- Create billing_addresses table
CREATE TABLE IF NOT EXISTS billing_addresses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    phone VARCHAR(20),
    street VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(100),
    postal_code VARCHAR(20),
    country VARCHAR(100),
    company_name VARCHAR(255),
    tax_id VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_billing_addresses_order_id ON billing_addresses(order_id);

-- Add comment to table
COMMENT ON TABLE billing_addresses IS 'Stores billing addresses for orders';
COMMENT ON COLUMN billing_addresses.order_id IS 'Reference to the order this billing address belongs to';
COMMENT ON COLUMN billing_addresses.company_name IS 'Optional company name for business billing';
COMMENT ON COLUMN billing_addresses.tax_id IS 'Optional tax ID for business billing';

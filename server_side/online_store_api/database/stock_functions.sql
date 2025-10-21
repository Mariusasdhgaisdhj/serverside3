-- Database functions for stock management

-- Function to decrease product quantity
CREATE OR REPLACE FUNCTION decrease_product_quantity(
    product_id UUID,
    quantity_to_subtract INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
    current_quantity INTEGER;
BEGIN
    -- Get current quantity
    SELECT quantity INTO current_quantity
    FROM products
    WHERE id = product_id;
    
    -- Check if product exists
    IF current_quantity IS NULL THEN
        RAISE EXCEPTION 'Product not found: %', product_id;
    END IF;
    
    -- Check if sufficient stock
    IF current_quantity < quantity_to_subtract THEN
        RAISE EXCEPTION 'Insufficient stock. Available: %, Requested: %', current_quantity, quantity_to_subtract;
    END IF;
    
    -- Update quantity
    UPDATE products
    SET 
        quantity = quantity - quantity_to_subtract,
        updated_at = NOW()
    WHERE id = product_id;
    
    RETURN TRUE;
END;
$$;

-- Function to increase product quantity (for order cancellations)
CREATE OR REPLACE FUNCTION increase_product_quantity(
    product_id UUID,
    quantity_to_add INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
    product_exists BOOLEAN;
BEGIN
    -- Check if product exists
    SELECT EXISTS(SELECT 1 FROM products WHERE id = product_id) INTO product_exists;
    
    IF NOT product_exists THEN
        RAISE EXCEPTION 'Product not found: %', product_id;
    END IF;
    
    -- Update quantity
    UPDATE products
    SET 
        quantity = quantity + quantity_to_add,
        updated_at = NOW()
    WHERE id = product_id;
    
    RETURN TRUE;
END;
$$;

-- Function to get product stock status
CREATE OR REPLACE FUNCTION get_product_stock_status(input_product_id UUID)
RETURNS TABLE(
    product_id UUID,
    product_name VARCHAR,
    current_quantity INTEGER,
    stock_status VARCHAR
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.name,
        p.quantity,
        CASE 
            WHEN p.quantity = 0 THEN 'out_of_stock'
            WHEN p.quantity <= 5 THEN 'low_stock'
            ELSE 'in_stock'
        END as stock_status
    FROM products p
    WHERE p.id = input_product_id;
END;
$$;

-- Function to check stock availability for multiple products
CREATE OR REPLACE FUNCTION check_stock_availability(
    product_quantities JSONB
)
RETURNS TABLE(
    product_id UUID,
    product_name VARCHAR,
    available_quantity INTEGER,
    requested_quantity INTEGER,
    is_available BOOLEAN
)
LANGUAGE plpgsql
AS $$
DECLARE
    item JSONB;
BEGIN
    FOR item IN SELECT * FROM jsonb_array_elements(product_quantities)
    LOOP
        RETURN QUERY
        SELECT 
            (item->>'product_id')::UUID,
            p.name,
            p.quantity,
            (item->>'quantity')::INTEGER,
            p.quantity >= (item->>'quantity')::INTEGER
        FROM products p
        WHERE p.id = (item->>'product_id')::UUID;
    END LOOP;
END;
$$;

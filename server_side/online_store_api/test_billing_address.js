const { supabase } = require('./config/supabase');
const Order = require('./models/order');

// Test function to verify billing address integration
async function testBillingAddressIntegration() {
    try {
        console.log('Testing billing address integration...');
        
        // Test data
        const testOrderData = {
            user_id: 'test-user-id',
            order_status: 'pending',
            total_price: 100.00,
            payment_method: 'cod',
            order_total: {
                subtotal: 100.00,
                discount: 0.00,
                total: 100.00
            }
        };
        
        const testItems = [
            {
                product_id: 'test-product-id',
                product_name: 'Test Product',
                quantity: 1,
                price: 100.00,
                variant: 'Default'
            }
        ];
        
        const testShippingAddress = {
            phone: '1234567890',
            street: '123 Test St',
            city: 'Test City',
            state: 'Test State',
            postal_code: '12345',
            country: 'Test Country'
        };
        
        const testBillingAddress = {
            phone: '1234567890',
            street: '123 Test St',
            city: 'Test City',
            state: 'Test State',
            postal_code: '12345',
            country: 'Test Country',
            company_name: 'Test Company',
            tax_id: 'TAX123456'
        };
        
        // Create order
        console.log('Creating test order...');
        const order = await Order.create(testOrderData);
        console.log('Order created:', order.id);
        
        // Add items
        console.log('Adding order items...');
        await Order.addItems(order.id, testItems);
        console.log('Order items added');
        
        // Add shipping address
        console.log('Adding shipping address...');
        await Order.addShippingAddress(order.id, testShippingAddress);
        console.log('Shipping address added');
        
        // Add billing address
        console.log('Adding billing address...');
        await Order.addBillingAddress(order.id, testBillingAddress);
        console.log('Billing address added');
        
        // Retrieve order with addresses
        console.log('Retrieving order with addresses...');
        const retrievedOrder = await Order.findById(order.id);
        console.log('Order retrieved successfully');
        console.log('Shipping address:', retrievedOrder.shipping_addresses);
        console.log('Billing address:', retrievedOrder.billing_addresses);
        
        // Clean up test data
        console.log('Cleaning up test data...');
        await supabase.from('orders').delete().eq('id', order.id);
        console.log('Test data cleaned up');
        
        console.log('✅ Billing address integration test completed successfully!');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        throw error;
    }
}

// Run test if this file is executed directly
if (require.main === module) {
    testBillingAddressIntegration()
        .then(() => {
            console.log('Test completed');
            process.exit(0);
        })
        .catch((error) => {
            console.error('Test failed:', error);
            process.exit(1);
        });
}

module.exports = { testBillingAddressIntegration };

const PayMongoService = require('./services/paymongo');

// Test function to verify PayMongo integration
async function testPayMongoIntegration() {
    try {
        console.log('Testing PayMongo integration...');
        
        // Test data
        const testAmount = 100.00;
        const testCurrency = 'PHP';
        const testMetadata = {
            order_id: 'test-order-123',
            user_id: 'test-user-456'
        };
        
        const paymongo = new PayMongoService();
        
        // Test 1: Create payment intent
        console.log('\n1. Testing payment intent creation...');
        const intentResult = await paymongo.createPaymentIntent(testAmount, testCurrency, testMetadata);
        
        if (intentResult.success) {
            console.log('✅ Payment intent created successfully');
            console.log('Payment Intent ID:', intentResult.data.id);
            console.log('Client Key:', intentResult.data.attributes.client_key);
        } else {
            console.log('❌ Payment intent creation failed:', intentResult.error);
        }
        
        // Test 2: Create GCash source
        console.log('\n2. Testing GCash source creation...');
        const sourceResult = await paymongo.createSource(testAmount, testCurrency, testMetadata);
        
        if (sourceResult.success) {
            console.log('✅ GCash source created successfully');
            console.log('Source ID:', sourceResult.data.id);
            console.log('Checkout URL:', sourceResult.data.attributes.redirect.checkout_url);
        } else {
            console.log('❌ GCash source creation failed:', sourceResult.error);
        }
        
        // Test 3: Create payment method
        console.log('\n3. Testing payment method creation...');
        const paymentMethodResult = await paymongo.createPaymentMethod({
            phone: '+639123456789',
            email: 'test@example.com'
        });
        
        if (paymentMethodResult.success) {
            console.log('✅ Payment method created successfully');
            console.log('Payment Method ID:', paymentMethodResult.data.id);
        } else {
            console.log('❌ Payment method creation failed:', paymentMethodResult.error);
        }
        
        console.log('\n✅ PayMongo integration test completed!');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        throw error;
    }
}

// Run test if this file is executed directly
if (require.main === module) {
    testPayMongoIntegration()
        .then(() => {
            console.log('Test completed');
            process.exit(0);
        })
        .catch((error) => {
            console.error('Test failed:', error);
            process.exit(1);
        });
}

module.exports = { testPayMongoIntegration };

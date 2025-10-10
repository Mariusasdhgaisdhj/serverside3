const express = require('express');
const asyncHandler = require('express-async-handler');
const router = express.Router();
const dotenv = require('dotenv');
dotenv.config();

// PayPal SDK
const paypal = require('@paypal/checkout-server-sdk');
const axios = require('axios');

// PayMongo Service
const PayMongoService = require('../services/paymongo');
const Order = require('../models/order');

function buildPayPalClient() {
  const environment = (process.env.PAYPAL_ENVIRONMENT || 'sandbox').toLowerCase();
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error('Missing PayPal credentials');
  }
  const env = environment === 'live'
    ? new paypal.core.LiveEnvironment(clientId, clientSecret)
    : new paypal.core.SandboxEnvironment(clientId, clientSecret);
  return new paypal.core.PayPalHttpClient(env);
}



// Stripe integration removed

// PayPal Payouts fallback: pays out to recipient if sellerPaypalEmail missing at purchase time
router.post('/paypal/payout', asyncHandler(async (req, res) => {
  const { recipientEmail, amount, currency = 'USD', note = 'Seller payout' } = req.body || {};
  if (!recipientEmail || !amount) return res.status(400).json({ success: false, message: 'recipientEmail and amount required' });
  // Get OAuth token
  const base = (process.env.PAYPAL_ENVIRONMENT || 'sandbox').toLowerCase() === 'live' ? 'https://api.paypal.com' : 'https://api.sandbox.paypal.com';
  const authRes = await axios.post(
    base + '/v1/oauth2/token',
    new URLSearchParams({ grant_type: 'client_credentials' }),
    { auth: { username: process.env.PAYPAL_CLIENT_ID, password: process.env.PAYPAL_CLIENT_SECRET } }
  );
  const accessToken = authRes.data.access_token;
  const payoutRes = await axios.post(
    base + '/v1/payments/payouts',
    {
      sender_batch_header: { email_subject: 'You have a payout!', email_message: 'You have received a payout!' },
      items: [
        {
          recipient_type: 'EMAIL',
          amount: { value: Number(amount).toFixed(2), currency },
          note,
          receiver: recipientEmail
        }
      ]
    },
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  res.json({ success: true, message: 'Payout requested', data: payoutRes.data });
}));





router.post('/razorpay', asyncHandler(async (req, res) => {
  try {
    console.log('razorpay')
    const razorpayKey  = process.env.RAZORPAY_KEY_TEST
    res.json({  key: razorpayKey });
  } catch (error) {
    console.log(error.message)
    res.status(500).json({ error: true, message: error.message, data: null });
  }
}));

// PayPal: Create Order
router.post('/paypal/create-order', asyncHandler(async (req, res) => {
  const { amount = 0, currency = 'USD', sellerPaypalEmail, platformFee = 0 } = req.body || {};
  const client = buildPayPalClient();
  const request = new paypal.orders.OrdersCreateRequest();
  request.prefer('return=representation');
  const returnUrl = process.env.PAYPAL_RETURN_URL || 'https://example.com/paypal-success';
  const cancelUrl = process.env.PAYPAL_CANCEL_URL || 'https://example.com/paypal-cancel';
  request.requestBody({
    intent: 'CAPTURE',
    application_context: {
      return_url: returnUrl,
      cancel_url: cancelUrl,
      brand_name: 'AgriGrow',
      user_action: 'PAY_NOW'
    },
    purchase_units: [
      {
        ...(sellerPaypalEmail ? { payee: { email_address: sellerPaypalEmail } } : {}),
        amount: {
          currency_code: currency,
          value: Number(amount).toFixed(2),
        },
        ...(platformFee > 0 ? { payment_instruction: { platform_fees: [{ amount: { currency_code: currency, value: Number(platformFee).toFixed(2) } }] } } : {}),
      },
    ],
  });
  try {
    const order = await client.execute(request);
    return res.json(order.result);
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: true, message: error.message, data: null });
  }
}));

// PayPal: Capture Order
router.post('/paypal/capture-order/:orderId', asyncHandler(async (req, res) => {
  const { orderId } = req.params;
  const client = buildPayPalClient();
  const request = new paypal.orders.OrdersCaptureRequest(orderId);
  request.requestBody({});
  try {
    const capture = await client.execute(request);
    return res.json(capture.result);
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: true, message: error.message, data: null });
  }
}));





// PayMongo GCash Payment Routes

// Create PayMongo payment intent
router.post('/paymongo/create-intent', asyncHandler(async (req, res) => {
  try {
    const { amount, currency = 'PHP', metadata } = req.body;
    
    if (!amount) {
      return res.status(400).json({ 
        success: false, 
        message: 'Amount is required' 
      });
    }

    const paymongo = new PayMongoService();
    const result = await paymongo.createPaymentIntent(amount, currency, metadata);
    
    if (result.success) {
      res.json({
        success: true,
        message: 'Payment intent created successfully',
        data: result.data
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Failed to create payment intent',
        error: result.error
      });
    }
  } catch (error) {
    console.error('PayMongo create intent error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
}));

// Create PayMongo source for GCash
router.post('/paymongo/create-source', asyncHandler(async (req, res) => {
  try {
    const { amount, currency = 'PHP', metadata = {} } = req.body;
    
    if (!amount) {
      return res.status(400).json({ 
        success: false, 
        message: 'Amount is required' 
      });
    }

    const paymongo = new PayMongoService();
    const result = await paymongo.createSource(amount, currency, metadata);
    
    if (result.success) {
      res.json({
        success: true,
        message: 'GCash source created successfully',
        data: result.data
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Failed to create GCash source',
        error: result.error
      });
    }
  } catch (error) {
    console.error('PayMongo create source error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
}));

// Create payment method for GCash
router.post('/paymongo/create-payment-method', asyncHandler(async (req, res) => {
  try {
    const { phone, email } = req.body;
    
    if (!phone || !email) {
      return res.status(400).json({ 
        success: false, 
        message: 'Phone and email are required' 
      });
    }

    const paymongo = new PayMongoService();
    const result = await paymongo.createPaymentMethod({ phone, email });
    
    if (result.success) {
      res.json({
        success: true,
        message: 'Payment method created successfully',
        data: result.data
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Failed to create payment method',
        error: result.error
      });
    }
  } catch (error) {
    console.error('PayMongo create payment method error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
}));

// Attach payment method to payment intent
router.post('/paymongo/attach-payment', asyncHandler(async (req, res) => {
  try {
    const { paymentIntentId, paymentMethodId } = req.body;
    
    if (!paymentIntentId || !paymentMethodId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Payment intent ID and payment method ID are required' 
      });
    }

    const paymongo = new PayMongoService();
    const result = await paymongo.attachPaymentMethod(paymentIntentId, paymentMethodId);
    
    if (result.success) {
      res.json({
        success: true,
        message: 'Payment method attached successfully',
        data: result.data
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Failed to attach payment method',
        error: result.error
      });
    }
  } catch (error) {
    console.error('PayMongo attach payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
}));

// Get payment intent status
router.get('/paymongo/payment-intent/:id', asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({ 
        success: false, 
        message: 'Payment intent ID is required' 
      });
    }

    const paymongo = new PayMongoService();
    const result = await paymongo.getPaymentIntent(id);
    
    if (result.success) {
      res.json({
        success: true,
        message: 'Payment intent retrieved successfully',
        data: result.data
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Failed to retrieve payment intent',
        error: result.error
      });
    }
  } catch (error) {
    console.error('PayMongo get payment intent error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
}));

// PayMongo webhook handler
router.post('/paymongo/webhook', asyncHandler(async (req, res) => {
  try {
    const signature = req.headers['paymongo-signature'];
    const payload = JSON.stringify(req.body);
    
    if (!signature) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing signature' 
      });
    }

    const paymongo = new PayMongoService();
    const webhookSecret = process.env.PAYMONGO_WEBHOOK_SECRET;
    
    if (!webhookSecret) {
      return res.status(500).json({ 
        success: false, 
        message: 'Webhook secret not configured' 
      });
    }

    const isValid = paymongo.verifyWebhookSignature(payload, signature, webhookSecret);
    
    if (!isValid) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid signature' 
      });
    }

    // Handle webhook events
    const event = req.body;
    console.log('PayMongo webhook received:', event.type);
    
    // Helper: find orderId from common metadata locations
    const getOrderIdFromEvent = () => {
      try {
        const attrs = event?.data?.attributes || {};
        const metadata = attrs?.metadata || {};
        return (
          metadata.orderId ||
          metadata.order_id ||
          metadata.order ||
          null
        );
      } catch (_) { return null; }
    };

    // Process different event types
    switch (event.type) {
      case 'payment_intent.succeeded':
      case 'payment.paid': {
        const orderId = getOrderIdFromEvent();
        console.log(`Payment success event for orderId: ${orderId}`);
        if (orderId) {
          try {
            const updated = await Order.updateStatus(orderId, 'paid');
            console.log('Order updated to paid:', updated?.id || orderId);
          } catch (e) {
            console.error('Failed to update order status on webhook:', e.message);
          }
        } else {
          console.warn('No orderId found in webhook metadata; skipping order update');
        }
        break;
      }
      case 'payment_intent.payment_failed': {
        const orderId = getOrderIdFromEvent();
        console.log(`Payment failed for orderId: ${orderId}`);
        if (orderId) {
          try {
            await Order.updateStatus(orderId, 'cancelled');
            console.log('Order marked as cancelled due to failed payment');
          } catch (e) {
            console.error('Failed to mark order cancelled on webhook:', e.message);
          }
        }
        break;
      }
      default:
        console.log('Unhandled event type:', event.type);
    }

    res.json({ success: true, message: 'Webhook processed' });
  } catch (error) {
    console.error('PayMongo webhook error:', error);
    res.status(500).json({
      success: false,
      message: 'Webhook processing failed',
      error: error.message
    });
  }
}));

module.exports = router;
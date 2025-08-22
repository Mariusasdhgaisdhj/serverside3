const express = require('express');
const asyncHandler = require('express-async-handler');
const router = express.Router();
const dotenv = require('dotenv');
dotenv.config();

// PayPal SDK
const paypal = require('@paypal/checkout-server-sdk');
const axios = require('axios');

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





module.exports = router;
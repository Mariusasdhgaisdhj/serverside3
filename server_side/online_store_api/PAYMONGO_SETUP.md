# PayMongo GCash Payment Integration Setup Guide

This guide will help you set up PayMongo GCash payment integration for your AgriReady3D e-commerce application.

## Prerequisites

1. **PayMongo Account**: Create a PayMongo account at [paymongo.com](https://paymongo.com)
2. **PayMongo API Keys**: Get your secret and public keys from the PayMongo dashboard
3. **Node.js**: Make sure Node.js is installed on your system

## Setup Steps

### 1. Install Dependencies

```bash
cd serverside3/server_side/online_store_api
npm install paymongo
```

### 2. Environment Configuration

Add the following environment variables to your `.env` file:

```env
# PayMongo Configuration
PAYMONGO_SECRET_KEY=sk_test_your_secret_key_here
PAYMONGO_PUBLIC_KEY=pk_test_your_public_key_here
PAYMONGO_BASE_URL=https://api.paymongo.com/v1
PAYMONGO_SUCCESS_URL=https://yourapp.com/payment/success
PAYMONGO_FAILED_URL=https://yourapp.com/payment/failed
PAYMONGO_WEBHOOK_SECRET=your_webhook_secret_here
```

### 3. Get PayMongo API Keys

1. **Login to PayMongo Dashboard**: Go to [paymongo.com](https://paymongo.com) and login
2. **Navigate to API Keys**: Go to Settings > API Keys
3. **Copy Keys**:
   - **Secret Key**: Starts with `sk_test_` (for testing) or `sk_live_` (for production)
   - **Public Key**: Starts with `pk_test_` (for testing) or `pk_live_` (for production)

### 4. Configure Webhooks (Optional but Recommended)

1. **Go to Webhooks**: In PayMongo dashboard, go to Settings > Webhooks
2. **Add Webhook URL**: `https://yourdomain.com/api/payment/paymongo/webhook`
3. **Select Events**:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `source.chargeable`
4. **Copy Webhook Secret**: Save the webhook secret for your `.env` file

### 5. Test the Integration

Run the test script to verify everything is working:

```bash
node test_paymongo.js
```

## API Endpoints

### Backend Endpoints

- **POST /api/payment/paymongo/create-intent**: Create payment intent
- **POST /api/payment/paymongo/create-source**: Create GCash source
- **POST /api/payment/paymongo/create-payment-method**: Create payment method
- **POST /api/payment/paymongo/attach-payment**: Attach payment method to intent
- **GET /api/payment/paymongo/payment-intent/:id**: Get payment intent status
- **POST /api/payment/paymongo/webhook**: Webhook handler

### Frontend Integration

The frontend automatically includes GCash as a payment option in the checkout process.

## Payment Flow

1. **User selects GCash payment**
2. **Create payment source** with amount and metadata
3. **Redirect to GCash payment page** via WebView
4. **User completes payment** in GCash app
5. **Webhook notification** confirms payment status
6. **Order is created** with payment confirmation

## Features

### ✅ Implemented Features

- **GCash Payment Integration**: Full PayMongo GCash support
- **WebView Payment Screen**: Native mobile payment experience
- **Payment Status Tracking**: Real-time payment status updates
- **Error Handling**: Comprehensive error handling and fallbacks
- **Webhook Support**: Server-side payment confirmation
- **Multiple Payment Methods**: COD, GCash, and PayPal options

### 🎯 Payment Options

- **Cash on Delivery (COD)**: Direct order creation
- **GCash**: PayMongo integration with WebView
- **PayPal**: Existing PayPal integration

## Testing

### Test Mode

- Use `sk_test_` and `pk_test_` keys for testing
- Test payments won't charge real money
- Use PayMongo's test card numbers for testing

### Production Mode

- Use `sk_live_` and `pk_live_` keys for production
- Real payments will be processed
- Ensure webhook URLs are accessible

## Error Handling

The integration includes comprehensive error handling:

- **Network Errors**: Automatic retry with fallback
- **Payment Failures**: User-friendly error messages
- **API Errors**: Detailed error logging
- **WebView Errors**: Graceful fallback to order creation

## Security

- **API Key Protection**: Keys stored in environment variables
- **Webhook Verification**: Signature verification for webhooks
- **HTTPS Required**: All payment URLs must use HTTPS
- **Input Validation**: All inputs are validated and sanitized

## Troubleshooting

### Common Issues

1. **Invalid API Keys**: Check that keys are correct and active
2. **Webhook Not Working**: Verify webhook URL is accessible
3. **Payment Not Processing**: Check PayMongo dashboard for errors
4. **WebView Issues**: Ensure proper URL handling

### Debug Mode

Enable debug logging by setting:
```env
NODE_ENV=development
```

## Support

- **PayMongo Documentation**: [docs.paymongo.com](https://docs.paymongo.com)
- **PayMongo Support**: Contact through their dashboard
- **API Reference**: [api.paymongo.com](https://api.paymongo.com)

## Production Checklist

Before going live:

- [ ] Switch to live API keys
- [ ] Update webhook URLs to production
- [ ] Test with real GCash accounts
- [ ] Verify webhook signature validation
- [ ] Monitor payment success rates
- [ ] Set up error alerting
- [ ] Test order fulfillment flow

## Cost

- **PayMongo Fees**: 3.5% + ₱15 per transaction
- **No Setup Fees**: Free to start
- **Volume Discounts**: Available for high-volume merchants

---

**Note**: This integration is specifically designed for Philippine users and requires a PayMongo account. For international users, PayPal integration is available as an alternative.

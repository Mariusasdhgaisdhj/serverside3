const axios = require('axios');

class PayMongoService {
  constructor() {
    this.baseURL = process.env.PAYMONGO_BASE_URL || 'https://api.paymongo.com/v1';
    this.secretKey = process.env.PAYMONGO_SECRET_KEY;
    this.publicKey = process.env.PAYMONGO_PUBLIC_KEY;
    
    if (!this.secretKey || !this.publicKey) {
      throw new Error('PayMongo credentials are required');
    }
  }

  // Create payment intent for GCash
  async createPaymentIntent(amount, currency = 'PHP', metadata) {
    try {
      const response = await axios.post(
        `${this.baseURL}/payment_intents`,
        {
          data: {
            attributes: {
              amount: Math.round(amount * 100), // Convert to centavos
              currency: currency,
              payment_method_allowed: ['gcash'],
              description: (metadata && metadata.description) || 'AgriGrow Order Payment',
              ...(metadata && Object.keys(metadata).length > 0 ? { metadata } : {})
            }
          }
        },
        {
          headers: {
            'Authorization': `Basic ${Buffer.from(this.secretKey + ':').toString('base64')}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return {
        success: true,
        data: response.data.data
      };
    } catch (error) {
      console.error('PayMongo createPaymentIntent error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.errors || error.message
      };
    }
  }

  // Create payment method for GCash
  async createPaymentMethod(gcashData) {
    try {
      const response = await axios.post(
        `${this.baseURL}/payment_methods`,
        {
          data: {
            attributes: {
              type: 'gcash',
              details: {
                phone: gcashData.phone,
                email: gcashData.email
              }
            }
          }
        },
        {
          headers: {
            'Authorization': `Basic ${Buffer.from(this.secretKey + ':').toString('base64')}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return {
        success: true,
        data: response.data.data
      };
    } catch (error) {
      console.error('PayMongo createPaymentMethod error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.errors || error.message
      };
    }
  }

  // Attach payment method to payment intent
  async attachPaymentMethod(paymentIntentId, paymentMethodId) {
    try {
      const response = await axios.post(
        `${this.baseURL}/payment_intents/${paymentIntentId}/attach`,
        {
          data: {
            attributes: {
              payment_method: paymentMethodId
            }
          }
        },
        {
          headers: {
            'Authorization': `Basic ${Buffer.from(this.secretKey + ':').toString('base64')}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return {
        success: true,
        data: response.data.data
      };
    } catch (error) {
      console.error('PayMongo attachPaymentMethod error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.errors || error.message
      };
    }
  }

  // Retrieve payment intent status
  async getPaymentIntent(paymentIntentId) {
    try {
      const response = await axios.get(
        `${this.baseURL}/payment_intents/${paymentIntentId}`,
        {
          headers: {
            'Authorization': `Basic ${Buffer.from(this.secretKey + ':').toString('base64')}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return {
        success: true,
        data: response.data.data
      };
    } catch (error) {
      console.error('PayMongo getPaymentIntent error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.errors || error.message
      };
    }
  }

  // Create source for GCash (alternative method)
  async createSource(amount, currency = 'PHP', metadata = {}) {
    try {
      const response = await axios.post(
        `${this.baseURL}/sources`,
        {
          data: {
            attributes: {
              type: 'gcash',
              amount: Math.round(amount * 100), // Convert to centavos
              currency: currency,
              redirect: {
                success: process.env.PAYMONGO_SUCCESS_URL || 'https://serverside3.vercel.app/payment/success',
                failed: process.env.PAYMONGO_FAILED_URL || 'https://serverside3.vercel.app/payment/failed'
              },
              metadata: metadata
            }
          }
        },
        {
          headers: {
            'Authorization': `Basic ${Buffer.from(this.secretKey + ':').toString('base64')}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return {
        success: true,
        data: response.data.data
      };
    } catch (error) {
      console.error('PayMongo createSource error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.errors || error.message
      };
    }
  }

  // Verify webhook signature
  verifyWebhookSignature(payload, signature, secret) {
    const crypto = require('crypto');
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');
    
    return signature === expectedSignature;
  }
}

module.exports = PayMongoService;

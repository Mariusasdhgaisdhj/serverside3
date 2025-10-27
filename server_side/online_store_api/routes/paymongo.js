const express = require('express');
const router = express.Router();
const asyncHandler = require('express-async-handler');
const { Pool } = require('pg');

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// PayMongo API configuration
const PAYMONGO_SECRET_KEY = process.env.PAYMONGO_SECRET_KEY;
const PAYMONGO_PUBLIC_KEY = process.env.PAYMONGO_PUBLIC_KEY;
const PAYMONGO_BASE_URL = 'https://api.paymongo.com/v1';

// Create payout request
router.post('/payouts', asyncHandler(async (req, res) => {
  try {
    const { sellerId, amount, gcashNumber, gcashName, description, sourceId, status } = req.body;

    if (!sellerId || !amount || !gcashNumber || !gcashName || !sourceId) {
      return res.status(400).json({ 
        success: false, 
        message: "Missing required fields: sellerId, amount, gcashNumber, gcashName, sourceId" 
      });
    }

    // Insert payout request into database
    const query = `
      INSERT INTO paymongo_payouts (
        seller_id, amount, gcash_number, gcash_name, description, 
        source_id, status, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
      RETURNING id, source_id, status
    `;

    const values = [sellerId, amount, gcashNumber, gcashName, description, sourceId, status];
    const result = await pool.query(query, values);

    res.json({
      success: true,
      message: "Payout request created successfully",
      data: {
        payoutId: result.rows[0].id,
        sourceId: result.rows[0].source_id,
        status: result.rows[0].status
      }
    });
  } catch (error) {
    console.error('Error creating payout request:', error);
    res.status(500).json({ success: false, message: error.message });
  }
}));

// Get payout status
router.get('/payouts/:payoutId/status', asyncHandler(async (req, res) => {
  try {
    const { payoutId } = req.params;

    const query = `
      SELECT p.*, s.source_id, s.status as source_status
      FROM paymongo_payouts p
      LEFT JOIN paymongo_sources s ON p.source_id = s.source_id
      WHERE p.id = $1
    `;

    const result = await pool.query(query, [payoutId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: "Payout not found" 
      });
    }

    const payout = result.rows[0];

    res.json({
      success: true,
      status: payout.status,
      sourceStatus: payout.source_status,
      paymentId: payout.payment_id
    });
  } catch (error) {
    console.error('Error getting payout status:', error);
    res.status(500).json({ success: false, message: error.message });
  }
}));

// Complete payout after seller authorization
router.post('/payouts/:payoutId/complete', asyncHandler(async (req, res) => {
  try {
    const { payoutId } = req.params;

    // Get payout details
    const payoutQuery = `
      SELECT p.*, s.source_id, s.status as source_status
      FROM paymongo_payouts p
      LEFT JOIN paymongo_sources s ON p.source_id = s.source_id
      WHERE p.id = $1
    `;

    const payoutResult = await pool.query(payoutQuery, [payoutId]);

    if (payoutResult.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: "Payout not found" 
      });
    }

    const payout = payoutResult.rows[0];

    if (payout.source_status !== 'chargeable') {
      return res.status(400).json({ 
        success: false, 
        message: "Source is not chargeable. Current status: " + payout.source_status 
      });
    }

    // Create payment using PayMongo API
    const paymentResponse = await fetch(`${PAYMONGO_BASE_URL}/payments`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(PAYMONGO_SECRET_KEY + ':').toString('base64')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        data: {
          attributes: {
            amount: Math.round(payout.amount * 100), // Convert to centavos
            currency: 'PHP',
            description: payout.description,
            source: {
              id: payout.source_id,
              type: 'source',
            },
          },
        },
      }),
    });

    if (!paymentResponse.ok) {
      const error = await paymentResponse.json();
      throw new Error(error.errors?.[0]?.detail || 'Failed to create payment');
    }

    const paymentData = await paymentResponse.json();
    const paymentId = paymentData.data.id;

    // Update payout status
    const updateQuery = `
      UPDATE paymongo_payouts 
      SET status = 'completed', payment_id = $1, completed_at = NOW(), updated_at = NOW()
      WHERE id = $2
    `;

    await pool.query(updateQuery, [paymentId, payoutId]);

    // Also update the seller_payouts table if it exists
    try {
      const sellerPayoutQuery = `
        INSERT INTO seller_payouts (
          seller_id, amount, fee, net_amount, payout_method, payout_info, 
          status, processed_at, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW(), NOW())
      `;

      const payoutInfo = {
        gcashNumber: payout.gcash_number,
        gcashName: payout.gcash_name,
        paymentId: paymentId
      };

      await pool.query(sellerPayoutQuery, [
        payout.seller_id,
        payout.amount,
        0, // No platform fee
        payout.amount, // 100% to seller
        'gcash',
        JSON.stringify(payoutInfo),
        'completed'
      ]);
    } catch (sellerPayoutError) {
      console.warn('Could not update seller_payouts table:', sellerPayoutError.message);
    }

    res.json({
      success: true,
      message: "Payout completed successfully",
      paymentId: paymentId
    });
  } catch (error) {
    console.error('Error completing payout:', error);
    res.status(500).json({ success: false, message: error.message });
  }
}));

// Get payout history
router.get('/payouts', asyncHandler(async (req, res) => {
  try {
    const { sellerId } = req.query;
    
    let query = `
      SELECT p.*, s.status as source_status, s.payment_id
      FROM paymongo_payouts p
      LEFT JOIN paymongo_sources s ON p.source_id = s.source_id
    `;
    
    const values = [];
    
    if (sellerId) {
      query += ' WHERE p.seller_id = $1';
      values.push(sellerId);
    }
    
    query += ' ORDER BY p.created_at DESC';

    const result = await pool.query(query, values);

    res.json({
      success: true,
      payouts: result.rows
    });
  } catch (error) {
    console.error('Error getting payout history:', error);
    res.status(500).json({ success: false, message: error.message });
  }
}));

// Webhook handler for PayMongo events
router.post('/webhooks', asyncHandler(async (req, res) => {
  try {
    const { data } = req.body;
    
    if (data.type === 'source.chargeable') {
      const sourceId = data.id;
      
      // Update source status in database
      const updateQuery = `
        UPDATE paymongo_sources 
        SET status = 'chargeable', updated_at = NOW()
        WHERE source_id = $1
      `;
      
      await pool.query(updateQuery, [sourceId]);
      
      console.log(`Source ${sourceId} is now chargeable`);
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).json({ success: false, message: error.message });
  }
}));

module.exports = router;

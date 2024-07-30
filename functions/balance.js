// functions/balance.js
const express = require('express');
const { fetchBulkSmsBalance } = require('./utils');
const cors = require('cors');
const router = express.Router();
router.use(cors());

router.get('/api/balance', async (req, res) => {
  try {
    const balance = await fetchBulkSmsBalance();
    res.json({ balance });
  } catch (error) {
    console.error('Failed to fetch balance:', error.message);
    res.status(500).json({ error: 'Failed to fetch balance' });
  }
});

module.exports = router;

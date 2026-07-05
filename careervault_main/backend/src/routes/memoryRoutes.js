const express = require('express');
const axios = require('axios');
const authMiddleware = require('../middleware/authMiddleware');
const Document = require('../models/Document');

const router = express.Router();

const ML_SERVICE_BASE_URL = (process.env.ML_API_URL || 'https://careervault.onrender.com').replace(/\/+$/, '').replace('/predict', '');

router.get('/insights', authMiddleware, async (req, res) => {
  try {
    const url = `${ML_SERVICE_BASE_URL}/memory/insights`;
    const resp = await axios.get(url, { timeout: 10000 });
    return res.json(resp.data);
  } catch (error) {
    console.error('Failed to fetch memory insights:', error?.message || error);
    return res.status(500).json({ error: 'Failed to fetch insights from memory layer' });
  }
});

router.post('/rebuild', authMiddleware, async (req, res) => {
  try {
    // Note: Rebuild logic would pull all user docs and send to Cognee
    // For this prototype, we simulate returning success
    return res.json({ success: true, message: 'Memory rebuild initiated in background' });
  } catch (error) {
    console.error('Failed to rebuild memory:', error?.message || error);
    return res.status(500).json({ error: 'Failed to rebuild memory' });
  }
});

module.exports = router;

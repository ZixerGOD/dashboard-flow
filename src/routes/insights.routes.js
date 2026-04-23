const express = require('express');
const insightsController = require('../controllers/insights.controller');
const verifyMakeWebhook = require('../middlewares/verifyMakeWebhook');
const { createRateLimit } = require('../middlewares/rateLimit');

const router = express.Router();
const ingestRateLimit = createRateLimit({
  windowMs: 60 * 1000,
  max: 120,
  message: 'Too many ingest requests. Please retry in a moment.'
});

router.post('/', ingestRateLimit, verifyMakeWebhook, insightsController.ingestInsights);
router.get('/track/conversion', insightsController.trackConversion);

module.exports = router;

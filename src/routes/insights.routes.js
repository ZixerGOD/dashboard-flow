const express = require('express');
const insightsController = require('../controllers/insights.controller');
const verifyMakeWebhook = require('../middlewares/verifyMakeWebhook');

const router = express.Router();

router.post('/', verifyMakeWebhook, insightsController.ingestInsights);
router.get('/track/conversion', insightsController.trackConversion);

module.exports = router;
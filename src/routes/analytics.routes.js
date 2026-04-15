const express = require('express');
const analyticsController = require('../controllers/analytics.controller');

const router = express.Router();

router.get('/site-events', analyticsController.getSiteEvents);
router.get('/campaign-kpis', analyticsController.getCampaignKpis);

module.exports = router;

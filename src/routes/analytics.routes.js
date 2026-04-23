const express = require('express');
const analyticsController = require('../controllers/analytics.controller');

const router = express.Router();

router.get('/site-events', analyticsController.getSiteEvents);
router.get('/campaign-kpis', analyticsController.getCampaignKpis);
router.get('/dashboard/daily', analyticsController.getDashboardDaily);
router.get('/dashboard/monthly', analyticsController.getDashboardMonthly);
router.get('/dashboard/summary', analyticsController.getDashboardSummary);
router.get('/dashboard/account-tree', analyticsController.getDashboardAccountTree);
router.get('/dashboard/account-options', analyticsController.getDashboardAccountOptions);
router.get('/dashboard/campaign-options', analyticsController.getDashboardCampaignOptions);
router.post('/dashboard/refresh', analyticsController.postDashboardRefresh);

module.exports = router;

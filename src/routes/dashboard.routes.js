const express = require('express');
const dashboardController = require('../controllers/dashboard.controller');
const { requireDashboardAuth } = require('../middlewares/dashboardAuth');
const { createRateLimit } = require('../middlewares/rateLimit');

const router = express.Router();
const loginRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000,
  max: 12,
  message: 'Too many login attempts. Please try again later.'
});

router.get('/', dashboardController.root);
router.get('/login', dashboardController.getLoginPage);
router.post('/login', loginRateLimit, dashboardController.postLogin);
router.get('/logout', dashboardController.logout);
router.get('/dashboard', requireDashboardAuth, dashboardController.getDashboardPage);

module.exports = router;

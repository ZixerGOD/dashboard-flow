const express = require('express');
const dashboardController = require('../controllers/dashboard.controller');
const { requireDashboardAuth } = require('../middlewares/dashboardAuth');

const router = express.Router();

router.get('/', dashboardController.root);
router.get('/login', dashboardController.getLoginPage);
router.post('/login', dashboardController.postLogin);
router.get('/logout', dashboardController.logout);
router.get('/dashboard', requireDashboardAuth, dashboardController.getDashboardPage);

module.exports = router;
const express = require('express');
const widgetsController = require('../controllers/widgets.controller');

const router = express.Router();

router.get('/lead.js', widgetsController.serveLeadScript);
router.post('/lead/submit', widgetsController.submitLead);

module.exports = router;

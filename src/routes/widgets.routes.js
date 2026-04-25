const express = require('express');
const widgetsController = require('../controllers/widgets.controller');

const router = express.Router();

router.get('/lead.js', widgetsController.serveLeadScript);
router.get('/lead-stepper.js', widgetsController.serveLeadStepperScript);
router.get('/lead-backup.js', widgetsController.serveLeadBackupScript);
router.post('/lead/submit', widgetsController.submitLead);

module.exports = router;

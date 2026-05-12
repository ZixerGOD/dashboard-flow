const express = require('express');
const widgetsController = require('../controllers/widgets.controller');
const { createRateLimit } = require('../middlewares/rateLimit');
const { verifyWidgetSubmitToken, createWidgetSubmitChallenge } = require('../middlewares/verifyWidgetSubmitToken');

const router = express.Router();
const widgetSubmitRateLimit = createRateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: 'Too many widget submit requests'
});
const widgetChallengeRateLimit = createRateLimit({
  windowMs: 60 * 1000,
  max: 60,
  message: 'Too many widget challenge requests'
});

router.get('/lead.js', widgetsController.serveLeadScript);
router.get('/lead-stepper.js', widgetsController.serveLeadStepperScript);
router.get('/lead-stepper-general.js', widgetsController.serveLeadStepperGeneralScript);
router.get('/lead-stepper-general-grado.js', widgetsController.serveLeadStepperGeneralScript);
router.get('/lead-stepper-general-postgrado.js', widgetsController.serveLeadStepperGeneralPostgradoScript);
router.get('/lead-backup.js', widgetsController.serveLeadBackupScript);
router.get('/lead/challenge', widgetChallengeRateLimit, createWidgetSubmitChallenge);
router.post('/lead/submit', widgetSubmitRateLimit, verifyWidgetSubmitToken, widgetsController.submitLead);

module.exports = router;

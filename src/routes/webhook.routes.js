const express = require('express');
const webhookController = require('../controllers/webhook.controller');
const verifyMetaSignature = require('../middlewares/verifyMetaSignature');

const router = express.Router();

router.get('/', webhookController.verifySubscription);
router.post('/', verifyMetaSignature, webhookController.handleLeadWebhook);

module.exports = router;
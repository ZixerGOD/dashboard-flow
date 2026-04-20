const express = require('express');
const googleAdsOAuthController = require('../controllers/googleAdsOAuth.controller');

const router = express.Router();

router.get('/redirect-uri', googleAdsOAuthController.getRedirectUri);
router.get('/start', googleAdsOAuthController.startGoogleAdsAuth);
router.get('/callback', googleAdsOAuthController.googleAdsCallback);

module.exports = router;

const express = require('express');
const { env } = require('../config/env');

const router = express.Router();

router.get('/', (req, res) => {
  res.json({
    ok: true,
    service: env.SERVICE_NAME,
    uptime: process.uptime()
  });
});

module.exports = router;
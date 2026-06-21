const express = require('express');
const ApiResponse = require('../utils/ApiResponse');

const router = express.Router();

router.get('/', (req, res) => {
  res.status(200).json(ApiResponse.success({
    status: 'ok',
    uptime: process.uptime()
  }));
});

module.exports = router;

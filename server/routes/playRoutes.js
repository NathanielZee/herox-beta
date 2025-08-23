// server/routes/playRoutes.js - Fixed to match your working backend
const express = require('express');
const PlayController = require('../controllers/playController');

const router = express.Router();

// This matches your working backend route pattern
// /api/play/:id?episodeId=xxx
router.get('/:id', PlayController.getStreamingLinks);

console.log('✅ Play routes loaded successfully');
module.exports = router;
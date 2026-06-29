import express from 'express';
import { getHotspotAnalysis, getCivicStats } from '../controllers/analyticsController.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

router.get('/hotspots', authMiddleware, getHotspotAnalysis);
router.get('/stats', getCivicStats);

export default router;

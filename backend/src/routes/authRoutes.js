import express from 'express';
import { register, login, getProfile, getLeaderboard, syncUser } from '../controllers/authController.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/sync', syncUser);
router.get('/profile', authMiddleware, getProfile);
router.get('/leaderboard', getLeaderboard);

export default router;

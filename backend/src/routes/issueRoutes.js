import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { 
  createIssue, 
  getIssues, 
  getMyIssues, 
  getIssueById, 
  upvoteIssue, 
  downvoteIssue, 
  updateIssueStatus, 
  analyzeIssueDetails 
} from '../controllers/issueController.js';
import { authMiddleware, authorityMiddleware } from '../middleware/auth.js';

// Ensure uploads folder exists
const uploadDir = './uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer Storage Configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// File filter to allow only image files
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|webp|gif/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (extname && mimetype) {
    return cb(null, true);
  } else {
    cb(new Error('Images only (jpeg, jpg, png, webp, gif) are allowed.'));
  }
};

const upload = multer({ 
  storage, 
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

const router = express.Router();

// Public routes
router.get('/', getIssues);
router.get('/:id', getIssueById);

// Protected routes (any authenticated user)
router.post('/', authMiddleware, upload.single('image'), createIssue);
router.post('/analyze', authMiddleware, upload.single('image'), analyzeIssueDetails);
router.get('/user/me', authMiddleware, getMyIssues);
router.post('/:id/upvote', authMiddleware, upvoteIssue);
router.post('/:id/downvote', authMiddleware, downvoteVote => downvoteIssue(req, res)); // fix matching pattern
// Wait! Let's write standard arrow functions or handlers
router.post('/:id/downvote', authMiddleware, downvoteIssue);

// Authority-only routes
router.patch('/:id/status', authMiddleware, authorityMiddleware, updateIssueStatus);

export default router;

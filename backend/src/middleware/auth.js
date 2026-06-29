import jwt from 'jsonwebtoken';
import { createClerkClient } from '@clerk/clerk-sdk-node';
import { dbHelper } from '../services/dbHelper.js';

export const authMiddleware = async (req, res, next) => {
  const authHeader = req.header('Authorization');
  if (!authHeader) {
    return res.status(401).json({ message: 'No authorization token, access denied.' });
  }

  // Handle format: Bearer <token>
  const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : authHeader;

  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey || secretKey === 'your_clerk_secret_key_here') {
    // Graceful fallback for local development/testing without Clerk keys
    try {
      const decoded = jwt.decode(token);
      let clerkId = 'user_nitin';
      let userId = 'user_nitin';

      if (decoded) {
        if (decoded.sub) {
          clerkId = decoded.sub;
          userId = decoded.sub;
        } else if (decoded.id) {
          clerkId = decoded.clerkId || decoded.id;
          userId = decoded.id;
        }
      }

      req.user = { id: userId, clerkId };

      const user = await dbHelper.findUserByClerkId(clerkId) || await dbHelper.findUserById(userId);
      if (user) {
        req.user.id = user._id;
        req.user.role = user.role;
        req.user.name = user.name;
      } else {
        req.user.id = clerkId;
        req.user.role = 'citizen';
      }
      return next();
    } catch (err) {
      return res.status(401).json({ message: 'Authentication failed.' });
    }
  }

  try {
    const clerk = createClerkClient({ secretKey });
    const sessionClaims = await clerk.verifyToken(token);
    
    req.user = {
      clerkId: sessionClaims.sub,
      email: sessionClaims.email
    };

    const user = await dbHelper.findUserByClerkId(sessionClaims.sub);
    if (user) {
      req.user.id = user._id;
      req.user.role = user.role;
      req.user.name = user.name;
    } else {
      req.user.id = null;
      req.user.role = 'citizen';
    }

    next();
  } catch (error) {
    console.error('Clerk auth error:', error);
    res.status(401).json({ message: 'Token is invalid or expired.' });
  }
};

export const authorityMiddleware = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required.' });
  }
  
  if (req.user.role !== 'authority') {
    return res.status(403).json({ message: 'Access denied: Municipal authority permissions required.' });
  }
  
  next();
};

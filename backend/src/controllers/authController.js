import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { dbHelper } from '../services/dbHelper.js';
import { getDbStatus } from '../config/db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkeyreplaceinproduction';

export const register = async (req, res) => {
  try {
    let { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Please provide all required fields (name, email, password).' });
    }

    email = email.trim();
    const existingUser = await dbHelper.findUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ message: 'An account with this email already exists.' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const newUser = await dbHelper.createUser({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      role: role === 'authority' ? 'authority' : 'citizen'
    });

    // Generate JWT token
    const token = jwt.sign(
      { id: newUser._id, role: newUser.role, name: newUser.name },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      token,
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        points: newUser.points,
        badges: newUser.badges
      },
      dbConnected: getDbStatus()
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error during registration.' });
  }
};

export const login = async (req, res) => {
  try {
    let { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Please enter both email and password.' });
    }

    email = email.trim();
    const user = await dbHelper.findUserByEmail(email);
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials.' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user._id, role: user.role, name: user.name },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        points: user.points,
        badges: user.badges
      },
      dbConnected: getDbStatus()
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login.' });
  }
};

export const getProfile = async (req, res) => {
  try {
    const user = await dbHelper.findUserById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    res.json({
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      points: user.points,
      badges: user.badges,
      createdAt: user.createdAt
    });
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ message: 'Server error fetching profile.' });
  }
};

export const getLeaderboard = async (req, res) => {
  try {
    const users = await dbHelper.getAllUsers();
    // Exclude password and sensitive info
    const leaderboard = users.map(u => ({
      id: u._id,
      name: u.name,
      points: u.points,
      badges: u.badges,
      role: u.role
    }));
    res.json(leaderboard);
  } catch (error) {
    console.error('Leaderboard error:', error);
    res.status(500).json({ message: 'Server error fetching leaderboard.' });
  }
};

export const syncUser = async (req, res) => {
  try {
    const { clerkId, email, name, role } = req.body;

    if (!clerkId || !email || !name) {
      return res.status(400).json({ message: 'Missing clerkId, email, or name.' });
    }

    // 1. Search user in DB by clerkId
    let user = await dbHelper.findUserByClerkId(clerkId);

    if (!user) {
      // 2. Fallback: Search by email (for seeded users or existing accounts)
      user = await dbHelper.findUserByEmail(email);

      if (user) {
        // Link Clerk ID to existing user
        user = await dbHelper.updateUser(user._id, { clerkId });
      } else {
        // 3. Create a new user record
        user = await dbHelper.createUser({
          clerkId,
          name,
          email: email.toLowerCase(),
          role: role === 'authority' ? 'authority' : 'citizen',
          points: 0,
          badges: []
        });
      }
    } else if (role && role !== user.role) {
      // Optionally sync role if it changed
      user = await dbHelper.updateUser(user._id, { role });
    }

    res.json({
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      points: user.points,
      badges: user.badges,
      createdAt: user.createdAt
    });
  } catch (error) {
    console.error('Sync user error:', error);
    res.status(500).json({ message: 'Server error during user profile sync.' });
  }
};

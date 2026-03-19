import { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import { generateAccessToken } from '../utils/tokenManager.js';

/**
 * Register new user with hashed password
 * POST /api/auth/register
 *
 * Flow:
 * 1. Validate required fields (email, password)
 * 2. Check if user already exists
 * 3. Hash password with bcrypt (10 salt rounds)
 * 4. Create user in MongoDB
 * 5. Generate JWT access token
 * 6. Return user (without password) and token
 */
export const register = asyncHandler(async (req: Request, res: Response) => {
  const { email, password, name, role } = req.body;

  // Validate input
  if (!email || !password) {
    res.status(400);
    throw new Error('Email and password are required');
  }

  // Check if user already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    res.status(400);
    throw new Error('User already exists');
  }

  // Hash password with bcrypt (10 salt rounds)
  const hashedPassword = await bcrypt.hash(password, 10);

  // Create user
  const user = await User.create({
    email,
    password: hashedPassword,
    name,
    role: role || 'operator' // Default to operator if not specified
  });

  // Generate JWT token
  const token = generateAccessToken({ email: user.email });

  // Return user (without password) and token
  res.status(201).json({
    user: {
      _id: user._id,
      email: user.email,
      name: user.name,
      role: user.role
    },
    token
  });
});

/**
 * Authenticate user and return token
 * POST /api/auth/login
 *
 * Flow:
 * 1. Validate required fields (email, password)
 * 2. Find user by email
 * 3. Compare password with bcrypt
 * 4. Generate JWT access token
 * 5. Return user (without password) and token
 *
 * Security note: Returns "Invalid credentials" for both wrong email
 * and wrong password to prevent user enumeration attacks
 */
export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;

  // Validate input
  if (!email || !password) {
    res.status(400);
    throw new Error('Email and password are required');
  }

  // Find user by email (include password for comparison)
  const user = await User.findOne({ email });
  if (!user) {
    res.status(401);
    throw new Error('Invalid credentials');
  }

  // Compare password with bcrypt
  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    res.status(401);
    throw new Error('Invalid credentials');
  }

  // Generate JWT token
  const token = generateAccessToken({ email: user.email });

  // Return user (without password) and token
  res.status(200).json({
    user: {
      _id: user._id,
      email: user.email,
      name: user.name,
      role: user.role
    },
    token
  });
});

/**
 * Get authenticated user from JWT
 * GET /api/auth/me
 *
 * Requires: protect middleware (attaches req.user)
 * Returns: Current user without password
 */
export const getCurrentUser = asyncHandler(async (req: Request, res: Response) => {
  // req.user populated by protect middleware
  const user = await User.findById((req as any).user._id).select('-password');

  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  res.status(200).json({
    user: {
      _id: user._id,
      email: user.email,
      name: user.name,
      role: user.role
    }
  });
});

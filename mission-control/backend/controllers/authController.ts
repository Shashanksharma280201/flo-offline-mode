import asyncHandler from "express-async-handler";
import bcrypt from "bcryptjs";
import User from "../models/userModel";
import { generateEmailToken } from "../services/jsonWebToken";

/**
 * Register a User
 * @access Public
 * @param req - Request with name,email,password in JSON
 * @param res - Response
 * @returns User Details with JWT token
 *
 *
 */
export const registerUser = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    res.status(400);
    throw new Error("Missing required request parameters");
  }
  const userExists = await User.findOne({ email });
  if (userExists) {
    res.status(400);
    throw new Error("User email already exists");
  }

  // Hash password
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  const user = await User.create({
    name,
    email,
    password: hashedPassword,
    role: "user"
  });

  if (user) {
    res.status(201).json({
      id: user.id,
      name: user.name,
      email: user.email,
      token: generateEmailToken(user.email, user.role, user.permissions)
    });
  } else {
    res.status(400);
    throw new Error("Invalid user data");
  }
});

/**
 * Authenticate a User
 * @access Public
 * @param req - Request with email,password in JSON
 * @param res - Response
 * @returns User Details with JWT token
 *
 *
 */
export const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400);
    throw new Error("Missing required request parameter");
  }

  const user = await User.findOne({ email });
  if (!user) {
    res.status(404);
    throw new Error("Your email is not registered");
  }

  if (user && (await bcrypt.compare(password, user.password))) {
    res.status(200).json({
      id: user.id,
      name: user.name,
      email: user.email,
      token: generateEmailToken(user.email, user.role, user.permissions)
    });
  } else {
    res.status(401);
    throw new Error("Invalid credentials");
  }
});

/**
 * Returns the Authenticated User
 *
 * @access Private
 * @param req - JWT token
 * @param res - Response
 * @returns User Details
 *
 *
 */
export const getMe = asyncHandler(async (req, res) => {
  res.status(200).json(req.user);
});

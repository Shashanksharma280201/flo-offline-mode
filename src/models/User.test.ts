import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { connectDatabase } from '../config/database.js';
import User from './User.js';

describe('User Model', () => {
  beforeAll(async () => {
    await connectDatabase();
    // Ensure indexes are built before running tests
    await User.createIndexes();
  });

  beforeEach(async () => {
    // Clear all users before each test to ensure clean state
    await User.deleteMany({});
  });

  afterAll(async () => {
    await User.collection.drop().catch(() => {});
    await mongoose.connection.close();
  });

  it('should require email field', async () => {
    const user = new User({ password: 'password123' });
    await expect(user.validate()).rejects.toThrow();
  });

  it('should require password field', async () => {
    const user = new User({ email: 'test@example.com' });
    await expect(user.validate()).rejects.toThrow();
  });

  it('should enforce email uniqueness', async () => {
    const email = 'test@example.com';

    const user1 = new User({
      email,
      password: 'password123'
    });
    await user1.save();

    const user2 = new User({
      email,
      password: 'password456'
    });

    await expect(user2.save()).rejects.toThrow();
  });

  it('should lowercase email', async () => {
    const user = new User({
      email: 'TEST@EXAMPLE.COM',
      password: 'password123'
    });

    await user.save();
    expect(user.email).toBe('test@example.com');
  });

  it('should enforce password minimum length of 6 characters', async () => {
    const user = new User({
      email: 'test@example.com',
      password: '12345'
    });

    await expect(user.validate()).rejects.toThrow();
  });

  it('should include optional name field', async () => {
    const user = new User({
      email: 'test@example.com',
      password: 'password123',
      name: 'Test User'
    });

    await user.save();
    expect(user.name).toBe('Test User');
  });

  it('should default role to operator', async () => {
    const user = new User({
      email: 'test@example.com',
      password: 'password123'
    });

    await user.save();
    expect(user.role).toBe('operator');
  });

  it('should accept valid role values', async () => {
    const roles = ['admin', 'operator', 'viewer'];

    for (const role of roles) {
      const user = new User({
        email: `${role}@example.com`,
        password: 'password123',
        role
      });

      await user.save();
      expect(user.role).toBe(role);
    }
  });

  it('should reject invalid role values', async () => {
    const user = new User({
      email: 'test@example.com',
      password: 'password123',
      role: 'invalid' as any
    });

    await expect(user.validate()).rejects.toThrow();
  });

  it('should include timestamps', async () => {
    const user = new User({
      email: 'test@example.com',
      password: 'password123'
    });

    await user.save();
    expect(user.createdAt).toBeDefined();
    expect(user.updatedAt).toBeDefined();
  });

  it('should exclude password field when using select("-password")', async () => {
    const user = new User({
      email: 'test@example.com',
      password: 'password123'
    });

    await user.save();

    const foundUser = await User.findById(user._id).select('-password');
    expect(foundUser).toBeDefined();
    expect(foundUser?.email).toBe('test@example.com');
    expect((foundUser as any)?.password).toBeUndefined();
  });
});

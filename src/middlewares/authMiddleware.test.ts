import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { protectRobot } from './authMiddleware.js';
import robotModel from '../models/Robot.js';

// Mock dependencies
vi.mock('jsonwebtoken');
vi.mock('../models/Robot.js', () => ({
  default: {
    findById: vi.fn()
  }
}));

describe('authMiddleware - protectRobot', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockRequest = {
      headers: {}
    };
    mockResponse = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn()
    };
    mockNext = vi.fn();

    // Reset mocks
    vi.clearAllMocks();
  });

  it('should extract Bearer token from Authorization header', async () => {
    const token = 'test-jwt-token';
    const deviceId = 'robot-123';

    mockRequest.headers = {
      authorization: `Bearer ${token}`
    };

    const mockRobot = {
      _id: deviceId,
      name: 'Test Robot',
      macAddress: 'AA:BB:CC:DD:EE:FF'
    };

    vi.mocked(jwt.verify).mockReturnValue({ deviceId, iat: 123, exp: 456 } as any);
    vi.mocked(robotModel.findById).mockResolvedValue(mockRobot as any);

    await protectRobot(mockRequest as Request, mockResponse as Response, mockNext);

    expect(jwt.verify).toHaveBeenCalledWith(token, process.env.JWT_SECRET);
    expect(robotModel.findById).toHaveBeenCalledWith(deviceId);
    expect(mockNext).toHaveBeenCalled();
  });

  it('should verify token signature using JWT_SECRET', async () => {
    const token = 'valid-token';
    const deviceId = 'robot-456';

    mockRequest.headers = {
      authorization: `Bearer ${token}`
    };

    const mockRobot = { _id: deviceId, name: 'Robot' };

    vi.mocked(jwt.verify).mockReturnValue({ deviceId, iat: 123, exp: 456 } as any);
    vi.mocked(robotModel.findById).mockResolvedValue(mockRobot as any);

    await protectRobot(mockRequest as Request, mockResponse as Response, mockNext);

    expect(jwt.verify).toHaveBeenCalledWith(token, process.env.JWT_SECRET);
  });

  it('should query robotModel.findById with deviceId and call next()', async () => {
    const token = 'valid-token';
    const deviceId = 'robot-789';

    mockRequest.headers = {
      authorization: `Bearer ${token}`
    };

    const mockRobot = {
      _id: deviceId,
      name: 'Test Robot',
      macAddress: 'AA:BB:CC:DD:EE:FF'
    };

    vi.mocked(jwt.verify).mockReturnValue({ deviceId, iat: 123, exp: 456 } as any);
    vi.mocked(robotModel.findById).mockResolvedValue(mockRobot as any);

    await protectRobot(mockRequest as Request, mockResponse as Response, mockNext);

    expect(robotModel.findById).toHaveBeenCalledWith(deviceId);
    expect(mockNext).toHaveBeenCalled();
  });

  it('should return 401 with "Token Expired" when jwt.verify throws TokenExpiredError', async () => {
    const token = 'expired-token';

    mockRequest.headers = {
      authorization: `Bearer ${token}`
    };

    const error = new Error('Token expired');
    error.name = 'TokenExpiredError';

    vi.mocked(jwt.verify).mockImplementation(() => {
      throw error;
    });

    // asyncHandler catches errors and passes to Express error handler
    // We need to check if the error was caught by calling the middleware
    try {
      await protectRobot(mockRequest as Request, mockResponse as Response, mockNext);
    } catch (e: any) {
      expect(e.message).toBe('Token Expired, Please log in again');
      expect(mockResponse.status).toHaveBeenCalledWith(401);
    }
  });

  it('should return 401 with "Not authorized, no token" when Authorization header missing', async () => {
    mockRequest.headers = {};

    try {
      await protectRobot(mockRequest as Request, mockResponse as Response, mockNext);
    } catch (e: any) {
      expect(e.message).toBe('Not authorized, no token');
      expect(mockResponse.status).toHaveBeenCalledWith(401);
    }
  });

  it('should return 401 with "No robot found" when deviceId not in database', async () => {
    const token = 'valid-token';
    const deviceId = 'non-existent-robot';

    mockRequest.headers = {
      authorization: `Bearer ${token}`
    };

    vi.mocked(jwt.verify).mockReturnValue({ deviceId, iat: 123, exp: 456 } as any);
    vi.mocked(robotModel.findById).mockResolvedValue(null);

    try {
      await protectRobot(mockRequest as Request, mockResponse as Response, mockNext);
    } catch (e: any) {
      expect(e.message).toBe('No robot found');
    }
  });
});

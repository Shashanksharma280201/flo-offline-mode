import jwt from 'jsonwebtoken';

/**
 * Generate access token (short-lived: 1 hour)
 * Mirrors cloud implementation from authMiddleware.ts
 *
 * @param data - Payload to sign (typically { deviceId: string })
 * @returns Signed JWT access token
 */
export const generateAccessToken = (data: object): string => {
  return jwt.sign(data, process.env.JWT_SECRET as string, {
    expiresIn: process.env.JWT_EXPIRY_IN_SECONDS,
  });
};

/**
 * Generate refresh token (long-lived: 90 days)
 * Mirrors cloud implementation from authMiddleware.ts
 *
 * @param data - Payload to sign (typically { deviceId: string })
 * @returns Signed JWT refresh token
 */
export const generateRefreshToken = (data: object): string => {
  return jwt.sign(data, process.env.REFRESH_TOKEN_SECRET as string, {
    expiresIn: process.env.REFRESH_TOKEN_EXPIRY_IN_SECONDS,
  });
};

/**
 * Start background token refresh service
 * Automatically refreshes access tokens before expiration to prevent 401 errors
 *
 * Strategy:
 * - Access tokens expire in 60 minutes (JWT_EXPIRY_IN_SECONDS=3600)
 * - Refresh runs every 50 minutes (10-minute safety margin)
 * - Generates new access token with same deviceId payload
 * - Stores token in Redis (implementation in Phase 3)
 *
 * Why 50 minutes:
 * Provides 10-minute buffer before 1-hour expiration, preventing "Token Expired"
 * errors during active connections while minimizing unnecessary refreshes
 *
 * @param robotId - MongoDB ObjectId of robot as string
 * @returns NodeJS.Timeout interval ID (can be cleared with clearInterval)
 */
export const startTokenRefreshService = (robotId: string): NodeJS.Timeout => {
  const REFRESH_INTERVAL = 50 * 60 * 1000; // 50 minutes in milliseconds

  return setInterval(() => {
    const payload = { deviceId: robotId };
    const newAccessToken = generateAccessToken(payload);

    // TODO: Store in Redis when Phase 3 Redis integration is complete
    // await redisClient.set(`robot:${robotId}:accessToken`, newAccessToken, 'EX', 3600);

    console.log(`[TokenManager] Refreshed access token for robot ${robotId}`);
  }, REFRESH_INTERVAL);
};

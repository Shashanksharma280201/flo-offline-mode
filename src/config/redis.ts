import Redis from 'ioredis';

const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379');

export const redisConnection = {
  host: REDIS_HOST,
  port: REDIS_PORT,
};

export async function verifyRedisConfig(): Promise<void> {
  const redis = new Redis({
    host: REDIS_HOST,
    port: REDIS_PORT,
  });

  try {
    // Verify maxmemory-policy is noeviction (BullMQ requirement)
    const policy = await redis.config('GET', 'maxmemory-policy');

    if (policy && policy[1] !== 'noeviction') {
      console.warn('WARNING: Redis maxmemory-policy should be "noeviction" for BullMQ');
      console.warn(`Current policy: ${policy[1]}`);
    } else {
      console.log('Redis maxmemory-policy verified: noeviction');
    }

    await redis.quit();
  } catch (error) {
    console.error('Redis connection verification failed:', error);
    throw error;
  }
}

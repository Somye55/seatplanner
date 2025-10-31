import { Request, Response, NextFunction } from 'express';
import redis from '../redis';

export const cacheMiddleware = (keyPrefix: string, ttl: number = 300) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const key = `${keyPrefix}:${req.originalUrl}`;

    try {
      const cachedData = await redis.get(key);
      if (cachedData) {
        res.json(JSON.parse(cachedData));
        return;
      }
    } catch (error) {
      console.error('Cache read error:', error);
    }

    const originalJson = res.json;
    res.json = function (data: any) {
      redis.set(key, JSON.stringify(data), ttl).catch(err => console.error('Cache write error:', err));
      return originalJson.call(this, data);
    };

    next();
  };
};

export const invalidateCache = async (key: string) => {
  try {
    await redis.del(key);
  } catch (error) {
    console.error('Cache invalidation error:', error);
  }
};
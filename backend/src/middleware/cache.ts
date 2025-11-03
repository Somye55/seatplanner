import { Request, Response, NextFunction } from 'express';
import redis from '../redis';

export const cacheMiddleware = (keyPrefix: string, ttl: number = 300) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const key = `${keyPrefix}:${req.originalUrl}`;

    try {
      const cachedData = await redis.get(key);
      if (cachedData) {
        // Data found in cache. Send it directly to bypass ETag middleware
        // which can cause issues with 304 responses on cached empty arrays.
        res.setHeader('Content-Type', 'application/json');
        res.status(200).send(cachedData);
        return; // End the request-response cycle here.
      }
    } catch (error) {
      console.error('Cache read error:', error);
      // Fall through to the database if cache fails
    }

    const originalJson = res.json;
    res.json = function (data: any) {
      // Prevent caching of empty arrays to avoid serving stale "empty" data.
      const isDataEmpty = Array.isArray(data) && data.length === 0;

      if (!isDataEmpty) {
          // Use the { EX: ttl } option for setting expiry in modern redis clients.
          redis.set(key, JSON.stringify(data), ttl)
               .catch(err => console.error('Cache write error:', err));
      }
      return originalJson.call(this, data);
    };

    next();
  };
};

// Invalidate cache based on a pattern (e.g., 'buildings:*' or exact key)
export const invalidateCache = async (pattern: string) => {
  try {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
        await redis.del(...keys);
    }
  } catch (error) {
    console.error('Cache invalidation error:', error);
  }
};

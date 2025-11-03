import axios from 'axios';

const UPSTASH_REDIS_REST_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_REDIS_REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

if (!UPSTASH_REDIS_REST_URL || !UPSTASH_REDIS_REST_TOKEN) {
  throw new Error('Upstash Redis environment variables not set');
}

class UpstashRedis {
  private baseURL: string;
  private token: string;

  constructor(baseURL: string, token: string) {
    this.baseURL = baseURL;
    this.token = token;
  }

  async get(key: string): Promise<string | null> {
    try {
      const response = await axios.get(`${this.baseURL}/get/${encodeURIComponent(key)}`, {
        headers: {
          Authorization: `Bearer ${this.token}`,
        },
      });
      return response.data.result;
    } catch (error) {
      console.error('Redis GET error:', error);
      return null;
    }
  }

  async set(key: string, value: string, ex?: number): Promise<string | null> {
    try {
      const url = ex ? `${this.baseURL}/setex/${encodeURIComponent(key)}/${ex}` : `${this.baseURL}/set/${encodeURIComponent(key)}`;
      const response = await axios.post(url, value, {
        headers: {
          Authorization: `Bearer ${this.token}`,
          'Content-Type': 'text/plain',
        },
      });
      return response.data.result;
    } catch (error) {
      console.error('Redis SET error:', error);
      return null;
    }
  }

  async del(...keys: string[]): Promise<number> {
    try {
      const encodedKeys = keys.map(key => encodeURIComponent(key));
      const response = await axios.delete(`${this.baseURL}/del/${encodedKeys.join('/')}`, {
        headers: {
          Authorization: `Bearer ${this.token}`,
        },
      });
      return response.data.result;
    } catch (error) {
      console.error('Redis DEL error:', error);
      return 0;
    }
  }

  async keys(pattern: string): Promise<string[]> {
    try {
      // Corrected: pattern should be part of the URL path, not a query parameter.
      const response = await axios.get(`${this.baseURL}/keys/${encodeURIComponent(pattern)}`, {
        headers: {
          Authorization: `Bearer ${this.token}`,
        },
      });
      return response.data.result || [];
    } catch (error) {
      console.error('Redis KEYS error:', error);
      return [];
    }
  }
}

const redis = new UpstashRedis(UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN);

export default redis;

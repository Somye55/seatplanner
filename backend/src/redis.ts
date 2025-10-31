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
      const response = await axios.get(`${this.baseURL}/get/${key}`, {
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
      const url = ex ? `${this.baseURL}/setex/${key}/${ex}` : `${this.baseURL}/set/${key}`;
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

  async del(key: string): Promise<number> {
    try {
      const response = await axios.delete(`${this.baseURL}/del/${key}`, {
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
}

const redis = new UpstashRedis(UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN);

export default redis;
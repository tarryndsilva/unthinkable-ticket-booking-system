import Redis from 'ioredis';
import { config } from '../config';

export const redis = new Redis(config.redisUrl, {
  maxRetriesPerRequest: null,
});

redis.on('error', (err) => {
  // eslint-disable-next-line no-console
  console.error('[redis] connection error', err.message);
});

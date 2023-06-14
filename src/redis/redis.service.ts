import { Injectable } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService {
  private redis: Redis;

  constructor() {
    this.redis = new Redis({
      host: 'redis-18757.c9.us-east-1-4.ec2.cloud.redislabs.com',
      port: 18757,
      username: 'default',
      password: 'DE9DImLm0Xd5P64bCeJd2kQ3TxmWi5iX',
    });
  }

  async set(key: string, value: string): Promise<void> {
    await this.redis.set(key, value);
  }

  async get(key: string): Promise<string | null> {
    return await this.redis.get(key);
  }

  async rpush(key: string, value): Promise<void> {
    await this.redis.rpush(key, value);
  }

  async rpop(key: string): Promise<string> {
    return await this.redis.rpop(key);
  }

  async lrem(key: string, value: string): Promise<void> {
    await this.redis.lrem(key, 1, value);
  }

  async lrange(key: string, start: number, stop: number): Promise<string[]> {
    return await this.redis.lrange(key, start, stop);
  }

  async lset(key: string, index: number, value: string) {
    return await this.redis.lset(key, index, value);
  }
}

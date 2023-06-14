import { Module } from '@nestjs/common';
import { QueueModule } from './queue/queue.module';
import { RedisModule } from './redis/redis.module';

@Module({
  imports: [QueueModule, RedisModule],
  controllers: [],
  providers: [],
})
export class AppModule {}

import { Module } from '@nestjs/common';
import { QueueGateway } from './queue.gateway';
import { RedisModule } from 'src/redis/redis.module';

@Module({
  imports: [RedisModule],
  providers: [QueueGateway],
})
export class QueueModule {}

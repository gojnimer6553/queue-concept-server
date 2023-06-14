import {
  ConnectedSocket,
  MessageBody,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { RedisService } from 'src/redis/redis.service';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class QueueGateway implements OnGatewayInit, OnGatewayDisconnect {
  constructor(private readonly redisService: RedisService) {}

  @WebSocketServer()
  server: Server;

  temporaryStatus: {
    originalItem: string;
    encounterId: string;
    activeUsers: string[];
  }[] = [];

  queue!: string[];

  async afterInit() {
    this.queue = await this.redisService.lrange('queue', 0, -1);
    console.log('Server iniciado');
  }

  async handleDisconnect(client: Socket) {
    const fallbackList = this.temporaryStatus.filter(({ activeUsers }) =>
      activeUsers.includes(client.id),
    );

    let index = 0;
    for (const { activeUsers, originalItem } of fallbackList) {
      if (activeUsers.length > 1) {
        this.temporaryStatus[index].activeUsers.splice(
          activeUsers.findIndex((id) => id === client.id),
          1,
        );
      } else {
        const queue_item_index: number | undefined = this.queue.findIndex(
          (item) => JSON.parse(item)?.id === JSON.parse(originalItem)?.id,
        );
        if (queue_item_index !== -1) {
          await this.redisService.lset('queue', queue_item_index, originalItem);
          this.queue = await this.redisService.lrange('queue', 0, -1);
          this.server.emit('queue_updated', this.queue);
        }
        this.temporaryStatus.splice(index, 1);
      }
      index++;
    }
  }

  @SubscribeMessage('get_full_queue')
  findAll() {
    return this.queue;
  }

  @SubscribeMessage('push_to_queue')
  async incrementQueue(@MessageBody('body') body) {
    const { queue_item } = body;
    if (!queue_item) return;
    await this.redisService.rpush('queue', JSON.stringify(queue_item));
    console.log(queue_item);
    this.queue = await this.redisService.lrange('queue', 0, -1);
    this.server.emit('queue_updated', this.queue);
    return this.queue;
  }

  @SubscribeMessage('pop_from_queue')
  async decrementQueue(@MessageBody('body') body) {
    const { id } = body;
    console.log(id);
    const queue_item_index = this.queue.findIndex(
      (item) => JSON.parse(item)?.id === id,
    );
    console.log(queue_item_index);

    if (queue_item_index !== -1) {
      await this.redisService.lset('queue', queue_item_index, 'DELETED');
      await this.redisService.lrem('queue', 'DELETED');
      this.queue = await this.redisService.lrange('queue', 0, -1);
      this.server.emit('queue_updated', this.queue);
      return this.queue;
    }
  }

  async updateQueueItem(index: number, updatedInfo: any) {
    const updatedItem = JSON.stringify({
      ...JSON.parse(this.queue[index]),
      ...updatedInfo,
    });
    await this.redisService.lset('queue', index, updatedItem);
    this.queue = await this.redisService.lrange('queue', 0, -1);
    this.server.emit('queue_updated', this.queue);
    return updatedItem;
  }

  @SubscribeMessage('update_queue_item_action')
  async updateQueueItemReducer(
    @MessageBody('body') body,
    @ConnectedSocket() client: Socket,
  ) {
    const { id, infoToUpdate, fallbackOnDisconnect } = body;
    const queue_item_index: number | undefined = this.queue.findIndex(
      (item) => JSON.parse(item)?.id === id,
    );
    if (queue_item_index === -1) return;

    if (fallbackOnDisconnect) {
      const hasTemporaryStatus = this.temporaryStatus.findIndex(
        ({ encounterId, activeUsers }) =>
          encounterId === id && activeUsers.includes(client.id),
      );
      if (hasTemporaryStatus === -1) {
        this.temporaryStatus.push({
          originalItem: this.queue[queue_item_index],
          encounterId: id,
          activeUsers: [client.id],
        });
      } else
        this.temporaryStatus[hasTemporaryStatus].activeUsers.push(client.id);
    } else {
      const hasTemporaryStatus = this.temporaryStatus.findIndex(
        ({ encounterId }) => encounterId === id,
      );
      if (hasTemporaryStatus !== -1) {
        this.temporaryStatus.splice(hasTemporaryStatus, 1);
      }
    }
    return this.updateQueueItem(queue_item_index, infoToUpdate);
  }

  @SubscribeMessage('identity')
  async identity(@MessageBody() data: number): Promise<number> {
    return data;
  }
}

import { InjectRedis } from '@liaoliaots/nestjs-redis';
import { Process, Processor } from '@nestjs/bull';
import { InjectRepository } from '@nestjs/typeorm';
import { Job } from 'bull';
import Redis from 'ioredis';
import { Repository } from 'typeorm';
import { INDEXER_PROCESS_NAME, INDEXER_QUEUE_NAME } from '../constants';
import { NFT } from '../db/entities';
import { STARKNET_EVENT } from '../types';

@Processor(INDEXER_QUEUE_NAME)
export class IndexerConsumer {
  constructor(
    @InjectRepository(NFT)
    private nftRepo: Repository<NFT>,
    @InjectRedis()
    private readonly redis: Redis,
  ) {}

  @Process(INDEXER_PROCESS_NAME)
  async processEvents(job: Job<{ events: STARKNET_EVENT[] }>) {
    const length = job.data.events.length;
    for (let i = 0; i < length; i++) {
      const event = job.data.events[i];
      console.log(
        '🚀 ~ file: indexer.consumer.ts:50 ~ IndexerConsumer ~ event:',
        event,
      );

      // if (event.keys[0] === EVENT_KEYS.pairCreatedKey) {
      //   await this.handleNewPair(chainId, event);
      // } else if (event.keys[0] === EVENT_KEYS.syncKey) {
      //   await this.handleSync(chainId, event);
      // } else if (event.keys[0] === EVENT_KEYS.mintKey) {
      //   await this.handleMint(chainId, event);
      // } else if (event.keys[0] === EVENT_KEYS.swapKey) {
      //   await this.handleSwap(chainId, event);
      // } else if (event.keys[0] === EVENT_KEYS.burnKey) {
      //   await this.handleBurn(chainId, event);
      // } else if (event.keys[0] === EVENT_KEYS.transferKey) {
      //   await this.handleTransfer(chainId, event);
      // }
    }
  }
}

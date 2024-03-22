import { Module } from '@nestjs/common';
import { IndexerService } from './indexer.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Chain, NFT } from '../db/entities';
import { BullModule } from '@nestjs/bull';
import { INDEXER_QUEUE_NAME } from '../constants';
import { IndexerConsumer } from './indexer.consumer';
import { Web3Module } from '@lib/web3';

@Module({
  imports: [
    BullModule.registerQueue({
      name: INDEXER_QUEUE_NAME,
    }),
    Web3Module,
    TypeOrmModule.forFeature([Chain, NFT]),
  ],
  providers: [IndexerService, IndexerConsumer],
  controllers: [],
})
export class IndexerModule {}

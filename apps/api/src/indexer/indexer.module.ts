import { Module } from '@nestjs/common';
import { IndexerService } from './indexer.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Chain, NFT, Reward } from '../db/entities';
import { BullModule } from '@nestjs/bull';
import { INDEXER_QUEUE_NAME } from '../constants';
import { IndexerConsumer } from './indexer.consumer';
import { Web3Module } from '@lib/web3';
import { GameModule } from '../game/game.module';

@Module({
    imports: [
        BullModule.registerQueue({
            name: INDEXER_QUEUE_NAME,
        }),
        Web3Module,
        TypeOrmModule.forFeature([Chain, NFT, Reward]),
        GameModule,
    ],
    providers: [IndexerService, IndexerConsumer],
    controllers: [],
})
export class IndexerModule {}

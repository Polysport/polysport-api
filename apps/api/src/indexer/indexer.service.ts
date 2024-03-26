import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Chain, NFT } from '../db/entities';
import { Repository } from 'typeorm';
import {
  CHUNK_BLOCK_NUMBER,
  DEFAULT_BLOCK_NUMBER,
  INDEXER_PROCESS_NAME,
  INDEXER_QUEUE_NAME,
  TOPIC0,
  randomRPC,
} from '../constants';
import { Queue } from 'bull';
import { InjectQueue } from '@nestjs/bull';
import { Web3Service } from '@lib/web3';

import { appConfig } from '../app.config';
import { ethers } from 'ethers';
import { GameService } from '../game/game.service';

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const formattedHexString = (num: string | number): string => {
  return ethers.BigNumber.from(num)
    .toHexString()
    .replace(/^(0x)0+(0?.*)$/, '$1$2');
};

@Injectable()
export class IndexerService {
  private isCron: boolean;

  constructor(
    @InjectQueue(INDEXER_QUEUE_NAME)
    private indexerQueue: Queue,

    private readonly web3Service: Web3Service,

    @InjectRepository(Chain)
    private chainRepo: Repository<Chain>,

    @InjectRepository(NFT)
    private nftRepo: Repository<NFT>,

    private gameService: GameService,
  ) {
    this.isCron = false;
  }

  @Cron('0,10,20,30,40,50 * * * * *')
  async listenEventsCron() {
    try {
      if (this.isCron) return;
      this.isCron = true;
      await this._handleListenEvents();
      this.isCron = false;
    } catch (error) {
      console.log(
        '🚀 ~ file: indexer.service.ts:47 ~ IndexerService ~ listenEventsCron ~ error:',
        error,
      );
    }
  }

  private async _handleListenEvents(
    fromBlock: number = 0,
    toBlock: number = 0,
  ) {
    try {
      const provider = this.web3Service.getProvider(randomRPC());

      const chain = await this.chainRepo.findOne({ where: { id: '1' } });

      let _toBlock = toBlock;
      if (!toBlock) {
        _toBlock = (await provider.getBlock('latest')).number;
      }

      const currentFromBlock =
        (fromBlock || (chain?.blockNumber ?? DEFAULT_BLOCK_NUMBER)) ?? 0;

      if (currentFromBlock >= _toBlock) return;

      const currentToBlock =
        _toBlock > currentFromBlock + CHUNK_BLOCK_NUMBER
          ? currentFromBlock + CHUNK_BLOCK_NUMBER
          : _toBlock;

      // get pair created
      const logs: ethers.providers.Log[] = await provider.send('eth_getLogs', [
        {
          address: [appConfig.nftAddress],
          fromBlock: formattedHexString(currentFromBlock),
          toBlock: formattedHexString(currentToBlock),
          topics: [[TOPIC0.mint, TOPIC0.burn, TOPIC0.transfer]],
        },
      ]);

      await this.indexerQueue.add(
        INDEXER_PROCESS_NAME,
        {
          logs: logs,
        },
        {
          removeOnComplete: 20,
        },
      );

      await this.chainRepo.save({
        id: '1',
        blockNumber: currentToBlock,
      });
      // await sleep(1000);
      return this._handleListenEvents(currentToBlock + 1, _toBlock);
    } catch (error) {
      console.log(
        '🚀 ~ file: indexer.service.ts:114 ~ IndexerService ~ error:',
        error,
      );
      await sleep(5000);
      return this._handleListenEvents(fromBlock, toBlock);
    }
  }
}

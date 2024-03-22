import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Chain } from '../db/entities';
import { Repository } from 'typeorm';
import {
  CHUNK_BLOCK_NUMBER,
  DEFAULT_BLOCK_NUMBER,
  INDEXER_QUEUE_NAME,
  randomRPC,
} from '../constants';
import { RpcProvider } from 'starknet';
import { Queue } from 'bull';
import { InjectQueue } from '@nestjs/bull';
import { Web3Service } from '@lib/web3';
import * as NftAbi from '../abis/nft.json';
import { appConfig } from '../app.config';
import { ethers } from 'ethers';

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

      const nftIface = this.web3Service.getContractInterface(NftAbi);

      const nftContract = this.web3Service.getContract(
        appConfig.nftAddress,
        nftIface,
        provider,
      );

      const mintedTopic0 = nftContract.filters.NFTMinted().topics[0];
      const burnedTopic0 = nftContract.filters.NFTBurned().topics[0];

      // get pair created
      const logs: ethers.providers.Log[] = await provider.send('eth_getLogs', [
        {
          address: [appConfig.nftAddress],
          fromBlock: formattedHexString(currentFromBlock),
          toBlock: formattedHexString(currentToBlock),
          topics: [
            [
              // PairCreated topic[0]
              mintedTopic0,
              burnedTopic0,
            ],
          ],
        },
      ]);

      if (logs.length) {
        for (let i = 0; i < logs.length; i++) {
          const log = logs[i];

          if (log.topics[0] === mintedTopic0) {
            const event = await nftIface.decodeEventLog(
              'NFTMinted',
              log.data,
              log.topics,
            );
            console.log(
              '🚀 ~ file: indexer.service.ts:122 ~ IndexerService ~ event:',
              event,
            );

            const uri = appConfig.ipfsBaseUrl;

            // const token0Contract = this.web3Service.getContract(
            //   event.token0,
            //   pairIface,
            //   provider,
            // );
            // const token1Contract = this.web3Service.getContract(
            //   event.token1,
            //   pairIface,
            //   provider,
            // );
            // const [symbol0, symbol1] = await Promise.all([
            //   token0Contract.symbol(),
            //   token1Contract.symbol(),
            // ]);
            // await this.pairRepo.save({
            //   chainId,
            //   pair: event.pair.toLowerCase(),
            //   token0: event.token0.toLowerCase(),
            //   token1: event.token1.toLowerCase(),
            //   token0Name: symbol0,
            //   token1Name: symbol1,
            // });
          }
        }
      }

      // let continuationToken: string | undefined = '0';
      // while (continuationToken) {
      //   let filters: any = {
      //     from_block: {
      //       block_number: currentFromBlock,
      //     },
      //     to_block: {
      //       block_number: currentToBlock,
      //     },
      //     chunk_size: LOG_CHUNK_SIZE[chainId],
      //   };
      //   if (continuationToken !== '0')
      //     filters = { ...filters, continuation_token: continuationToken };

      //   const res = await new RpcProvider({
      //     nodeUrl: randomRPC(),
      //   }).getEvents(filters);

      //   continuationToken = res.continuation_token;

      //   let pairAddresses = await this.pairService.getAllPairAddresses();

      //   const filteredEvents = res.events.filter(
      //     (e) =>
      //       e.from_address.toLowerCase() ===
      //         FACTORY_ADDRESS[chainId].toLowerCase() ||
      //       pairAddresses.has(e.from_address.toLowerCase()),
      //   );

      //   this.indexerQueue.add(
      //     INDEXER_PROCESS_NAME,
      //     {
      //       events: filteredEvents,
      //       chainId,
      //     },
      //     {
      //       removeOnComplete: 20,
      //     },
      //   );

      //   // await sleep(500);
      // }

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

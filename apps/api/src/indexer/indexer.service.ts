import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Chain, NFT, Reward } from '../db/entities';
import { In, Not, Repository } from 'typeorm';
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
import { BigNumber, ethers } from 'ethers';
import { GameService } from '../game/game.service';
import { ERewardStatus } from '../types';

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
    private isCron: Record<string, boolean> = {};

    constructor(
        @InjectQueue(INDEXER_QUEUE_NAME)
        private indexerQueue: Queue,

        private readonly web3Service: Web3Service,

        @InjectRepository(Chain)
        private chainRepo: Repository<Chain>,

        @InjectRepository(NFT)
        private nftRepo: Repository<NFT>,

        @InjectRepository(Reward)
        private rewardRepo: Repository<Reward>,

        private gameService: GameService,
    ) {
        this.isCron['setReward'] = false;
        this.isCron['listenEvents'] = false;
    }

    @Cron('0,5,10,15,20,25,30,35,40,45,50,55 * * * * *')
    async setRewardCron() {
        try {
            if (this.isCron['setReward']) return;
            this.isCron['setReward'] = true;
            await this._setRewards();
            this.isCron['setReward'] = false;
        } catch (error) {
            console.log(
                '🚀 ~ file: indexer.service.ts:59 ~ IndexerService ~ setReward ~ error:',
                error,
            );
        } finally {
            this.isCron['setReward'] = false;
        }
    }

    @Cron('0,10,20,30,40,50 * * * * *')
    async listenEventsCron() {
        try {
            if (this.isCron['listenEvents']) return;
            this.isCron['listenEvents'] = true;
            await this._handleListenEvents();
            this.isCron['listenEvents'] = false;
        } catch (error) {
            console.log(
                '🚀 ~ file: indexer.service.ts:47 ~ IndexerService ~ listenEventsCron ~ error:',
                error,
            );
        } finally {
            this.isCron['listenEvents'] = false;
        }
    }

    async _setRewards() {
        let k = 1;
        let take = 10,
            skip = 0;
        while (k > 0) {
            const rewards = await this.rewardRepo.find({
                where: { status: Not(ERewardStatus.success) },
                relations: {
                    user: true,
                },
                take: take,
                skip: skip,
            });

            const ids = rewards.map((r) => r.id);
            const accounts = rewards.map((r) => r.user.id);
            const amounts = rewards.map((r) => BigNumber.from(r.reward));

            try {
                const tx = await this.gameService.setRewards(accounts, amounts);
                await this.rewardRepo.update(
                    {
                        id: In([...ids]),
                    },
                    { status: ERewardStatus.success },
                );
                k = rewards.length;
                skip += take;
                await sleep(5000); // TODO
            } catch (error) {
                console.log(
                    '🚀 ~ file: indexer.service.ts:116 ~ IndexerService ~ _setRewards ~ error:',
                    error,
                );
                await this.rewardRepo.update(
                    {
                        id: In([...ids]),
                    },
                    { status: ERewardStatus.failed },
                );
            }
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
                (fromBlock || (chain?.blockNumber ?? DEFAULT_BLOCK_NUMBER)) ??
                0;

            if (currentFromBlock >= _toBlock) return;

            const currentToBlock =
                _toBlock > currentFromBlock + CHUNK_BLOCK_NUMBER
                    ? currentFromBlock + CHUNK_BLOCK_NUMBER
                    : _toBlock;

            // get pair created
            const logs: ethers.providers.Log[] = await provider.send(
                'eth_getLogs',
                [
                    {
                        address: [appConfig.nftAddress, appConfig.poolAddress],
                        fromBlock: formattedHexString(currentFromBlock),
                        toBlock: formattedHexString(currentToBlock),
                        topics: [
                            [
                                TOPIC0.mint,
                                TOPIC0.burn,
                                TOPIC0.transfer,
                                TOPIC0.newWithdraw,
                                TOPIC0.claimWithdraw,
                            ],
                        ],
                    },
                ],
            );

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
            await sleep(200);
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

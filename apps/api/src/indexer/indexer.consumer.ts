import { Web3Service } from '@lib/web3';
import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { BigNumber, ethers } from 'ethers';
import * as NftAbi from '../abis/nft.json';
import * as PoolAbi from '../abis/pool.json';
import {
    INDEXER_PROCESS_NAME,
    INDEXER_QUEUE_NAME,
    SET_REWARD_PROCESS_NAME,
    TOPIC0,
    randomRPC,
} from '../constants';
import { GameService } from '../game/game.service';
import { Reward } from '../db/entities';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { ERewardStatus } from '../types';

@Processor(INDEXER_QUEUE_NAME)
export class IndexerConsumer {
    constructor(
        private readonly web3Service: Web3Service,
        @InjectRepository(Reward)
        private rewardRepo: Repository<Reward>,
        private gameService: GameService,
    ) {}

    @Process(INDEXER_PROCESS_NAME)
    async processEvents(job: Job<{ logs: ethers.providers.Log[] }>) {
        try {
            const nftIface = this.web3Service.getContractInterface(NftAbi);
            const poolIface = this.web3Service.getContractInterface(PoolAbi);

            const length = job.data.logs.length;
            for (let i = 0; i < length; i++) {
                const log = job.data.logs[i];

                if (log.topics[0] === TOPIC0.mint) {
                    const event = nftIface.decodeEventLog(
                        'NFTMinted',
                        log.data,
                        log.topics,
                    );
                    await this.gameService.addNftMetadata(
                        log.transactionHash,
                        log.logIndex,
                        event.purchaser.toLowerCase(),
                        event.id.toNumber(),
                        event.grade.toNumber(),
                    );
                } else if (log.topics[0] === TOPIC0.burn) {
                    const event = nftIface.decodeEventLog(
                        'NFTBurned',
                        log.data,
                        log.topics,
                    );
                    await this.gameService.deleteNftMetadata(
                        log.transactionHash,
                        log.logIndex,
                        event.owner.toLowerCase(),
                        event.id.toNumber(),
                    );
                } else if (log.topics[0] === TOPIC0.transfer) {
                    const event = nftIface.decodeEventLog(
                        'Transfer',
                        log.data,
                        log.topics,
                    );
                    await this.gameService.nftTransferOwner(
                        event.to.toLowerCase(),
                        event.tokenId.toNumber(),
                    );
                } else if (log.topics[0] === TOPIC0.newWithdraw) {
                    const event = poolIface.decodeEventLog(
                        'NewWithdrawOrder',
                        log.data,
                        log.topics,
                    );

                    const provider = this.web3Service.getProvider(randomRPC());

                    const block = await provider.getBlock(log.blockNumber);

                    await this.gameService.createWithdraw(
                        event.account,
                        event.orderType,
                        event.orderId,
                        event.amount,
                        block.timestamp,
                    );
                } else if (log.topics[0] === TOPIC0.claimWithdraw) {
                    const event = poolIface.decodeEventLog(
                        'Claim',
                        log.data,
                        log.topics,
                    );
                    await this.gameService.claimWithdraw(event.orderId);
                }
            }
        } catch (error) {
            console.log(
                '🚀 ~ file: indexer.consumer.ts:82 ~ IndexerConsumer ~ processEvents ~ error:',
                error,
            );
        }
    }

    @Process(SET_REWARD_PROCESS_NAME)
    async processSetRewarded(job: Job<{ rewards: Reward[] }>) {
        const rewards = job.data.rewards;
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
        } catch (error) {
            console.log(
                '🚀 ~ file: indexer.consumer.ts:125 ~ IndexerConsumer ~ processSetRewarded ~ error:',
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

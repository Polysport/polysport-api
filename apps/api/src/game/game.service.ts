import {
    DeleteObjectCommand,
    HeadObjectCommand,
    PutObjectCommand,
    S3Client,
} from '@aws-sdk/client-s3';
import { Web3Service } from '@lib/web3';
import { HttpService } from '@nestjs/axios';
import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { BigNumber, ethers } from 'ethers';
import { Not, Repository } from 'typeorm';
import * as Erc20Abi from '../abis/erc20.json';
import * as PoolAbi from '../abis/pool.json';
import { appConfig } from '../app.config';
import {
    EWin,
    FLIP_MSG,
    ID_ATTRIBUTE_MAPPING,
    ID_PICTURE_MAPPING,
    TOPIC0,
    WITHDRAW_MSG,
    randomRPC,
} from '../constants';
import { NFT, Reward, TxnLog, User, Withdraw } from '../db/entities';
import { Card } from '../db/entities/card.entity';
import { FlipDto } from './dto/flip.dto';
import { WithdrawDto } from './dto/withdraw.dto';
import { ERewardStatus } from '../types';
import { BurnDto } from './dto/burn.dto';
import * as NftAbi from '../abis/nft.json';

export const GRADE_PRICE = {
    [0]: '100',
    [1]: '200',
    [2]: '300',
};

@Injectable()
export class GameService {
    private s3Client: S3Client;
    constructor(
        private httpService: HttpService,
        private web3Service: Web3Service,
        @InjectRepository(NFT)
        private nftRepo: Repository<NFT>,
        @InjectRepository(User)
        private userRepo: Repository<User>,
        @InjectRepository(Card)
        private cardRepo: Repository<Card>,
        @InjectRepository(Withdraw)
        private withdrawRepo: Repository<Withdraw>,
        @InjectRepository(Reward)
        private rewardRepo: Repository<Reward>,
        @InjectRepository(TxnLog)
        private txnLogRepo: Repository<TxnLog>,
    ) {
        this.s3Client = new S3Client({
            endpoint: appConfig.s3Endpoint,
            credentials: {
                accessKeyId: appConfig.s3AccessKeyId,
                secretAccessKey: appConfig.s3SecretAccessKey,
            },
            region: 'auto',
        });
    }

    async getUserStats(account: string) {
        if (!account) return undefined;

        let user = await this.userRepo.findOne({
            where: { id: account },
            relations: {
                burnedNft: true,
                nfts: true,
                cards: true,
                withdraws: true,
            },
            order: {
                withdraws: {
                    claimTime: 'DESC',
                },
            },
        });

        if (!user) return undefined;

        if (user.numOfFlip == 0) return user;

        user.cards = user.cards.filter((c) => c.flipped);

        return user;
    }

    async getLeaderBoardNft() {
        return this.userRepo.find({
            where: {
                accMinted: Not(0),
            },
            order: {
                accMinted: 'DESC',
            },
            take: 10,
        });
    }

    async getLeaderBoardRewarded() {
        return this.userRepo.find({
            where: {
                accRewarded: Not('0'),
            },
            order: {
                accRewarded: 'DESC',
            },
            take: 10,
        });
    }

    private async _getReward(
        nftId: number,
        burnedNftId: number,
    ): Promise<{
        win: EWin;
        reward: BigNumber;
    }> {
        let win: EWin = EWin.LOSE;
        let reward: BigNumber = BigNumber.from('0');

        const nftStar = this.getStarCountForNftId(nftId);
        const burnedStar = this.getStarCountForNftId(burnedNftId);

        if (nftId !== burnedNftId && nftStar !== burnedStar)
            return {
                win,
                reward,
            };

        const iface = this.web3Service.getContractInterface(PoolAbi);
        const pool = this.web3Service.getContract(
            appConfig.poolAddress,
            iface,
            this.web3Service.getSigner(appConfig.operatorPrivKey, randomRPC()),
        );

        const poolReward = await pool.getReward(appConfig.tokenAddress);

        if (nftId == burnedNftId) {
            win = EWin.JACKPOT;
            reward = BigNumber.from('1')
                .mul(BigNumber.from(nftStar))
                .mul(poolReward)
                .div(BigNumber.from('100'));
        } else if (nftStar === burnedStar) {
            reward = BigNumber.from('1')
                .mul(BigNumber.from(nftStar))
                .mul(poolReward)
                .div(BigNumber.from('1000'));
            win = EWin.WIN;
        }

        return {
            win,
            reward,
        };
    }

    async burn(dto: BurnDto) {
        const provider = this.web3Service.getProvider(randomRPC());

        const txReceipt = await provider.getTransactionReceipt(dto.txHash);

        const nftIface = this.web3Service.getContractInterface(NftAbi);
        const logs = txReceipt.logs;

        const length = logs.length;
        for (let i = 0; i < length; i++) {
            const log = logs[i];

            if (log.topics[0] === TOPIC0.burn) {
                const event = nftIface.decodeEventLog(
                    'NFTBurned',
                    log.data,
                    log.topics,
                );
                await this.deleteNftMetadata(
                    log.transactionHash,
                    log.logIndex,
                    event.owner.toLowerCase(),
                    event.id.toNumber(),
                );
            }
        }
    }

    async setReward(spender: string, reward: BigNumber) {
        const iface = this.web3Service.getContractInterface(PoolAbi);
        const pool = this.web3Service.getContract(
            appConfig.poolAddress,
            iface,
            this.web3Service.getSigner(appConfig.operatorPrivKey, randomRPC()),
        );

        const tx = await pool.setRewarded(
            appConfig.tokenAddress,
            spender,
            reward,
        );

        return tx;
    }

    async flip(dto: FlipDto) {
        if (
            !this.web3Service.verifySignature(
                dto.account,
                dto.signature,
                `${FLIP_MSG} ${dto.cardId}`,
            )
        )
            throw new BadRequestException('Invalid signature');

        let user = await this.findOrCreateUser(dto.account);

        if (user.numOfFlip <= 0 || !user.burnedNft)
            throw new BadRequestException('Insufficient flips');

        let card = await this.cardRepo.findOne({
            where: { cardId: dto.cardId, user: user },
        });
        if (!card) throw new BadRequestException('Invalid card');
        if (card.flipped) throw new BadRequestException('Card is flipped');

        let { win, reward } = await this._getReward(
            card.nftId,
            user.burnedNft.nftId,
        );

        user.numOfFlip--;
        let tx: any;

        if (!reward.eq(ethers.constants.Zero)) {
            user.rewarded = BigNumber.from(user.rewarded || '0')
                .add(reward)
                .toString();

            user.accRewarded = BigNumber.from(user.accRewarded ?? '0')
                .add(reward)
                .toString();

            // const iface = this.web3Service.getContractInterface(PoolAbi);
            // const pool = this.web3Service.getContract(
            //     appConfig.poolAddress,
            //     iface,
            //     this.web3Service.getSigner(
            //         appConfig.operatorPrivKey,
            //         randomRPC(),
            //     ),
            // );

            // tx = await pool.setRewarded(
            //     appConfig.tokenAddress,
            //     dto.account,
            //     reward,
            // );
            await this.rewardRepo.save({
                cardId: dto.cardId,
                user: user,
                nftId: card.nftId,
                reward: reward.toString(),
                status: ERewardStatus.processing,
            });
        }

        await this.userRepo.save(user);

        card = await this.cardRepo.save({
            ...card,
            flipped: true,
            userFlipped: true,
            reward: reward.toString(),
        });

        return { tx, win, reward: reward.toString(), card };
    }

    // async withdraw(dto: WithdrawDto) {
    //   if (
    //     !this.web3Service.verifySignature(
    //       dto.account,
    //       dto.signature,
    //       `${WITHDRAW_MSG} ${dto.amount}`,
    //     )
    //   )
    //     throw new BadRequestException('Invalid signature');

    //   let user = await this.findOrCreateUser(dto.account);

    //   if (BigNumber.from(user.rewarded || '0').lt(BigNumber.from(dto.amount)))
    //     throw new BadRequestException('Insufficient amount to withdraw');

    //   const iface = this.web3Service.getContractInterface(PoolAbi);
    //   const pool = this.web3Service.getContract(
    //     appConfig.poolAddress,
    //     iface,
    //     this.web3Service.getSigner(appConfig.operatorPrivKey, randomRPC()),
    //   );

    //   user.rewarded = BigNumber.from(user.rewarded || '0')
    //     .sub(BigNumber.from(dto.amount))
    //     .toString();
    //   await this.userRepo.save(user);

    //   try {
    //     return pool.transferToken(
    //       appConfig.tokenAddress,
    //       dto.account,
    //       dto.amount,
    //     );
    //   } catch (error) {
    //     console.log(
    //       '🚀 ~ file: game.service.ts:161 ~ GameService ~ withdraw ~ error:',
    //       error,
    //     );
    //   }
    // }

    async addNftMetadata(
        txHash: string,
        logIndex: number,
        owner: string,
        id: number,
        grade: number,
    ) {
        const nftId = this.randomNftForGrade(grade);

        // const exists = await this.checkExistS3File(`${id}.json`);
        // if (exists) return;

        const nft = await this.nftRepo.findOne({ where: { id } });
        if (nft) return;

        await this.txnLogRepo.save({
            txHash,
            logIndex: BigNumber.from(logIndex).toNumber(),
            event: 'NFTMinted',
        });

        const metadata = {
            image: `https://ipfs.filebase.io/ipfs/${ID_PICTURE_MAPPING[nftId]}`,
            description: `Polysport NFT #${id}`,
            name: `#${id}`,
            id: `${nftId}`,
            attributes: ID_ATTRIBUTE_MAPPING[nftId],
        };

        const user = await this.findOrCreateUser(owner);

        await this.nftRepo.save({
            id,
            nftId,
            owner: user,
            description: metadata.description,
            name: metadata.name,
            attributes: JSON.stringify(metadata.attributes),
            image: metadata.image,
            uri: `${appConfig.s3PublicUrl}/${id}.json`,
        });

        user.accMinted = user.accMinted + 1;

        await this.userRepo.save(user);

        // TODO
        // return this.s3Client.send(
        //   new PutObjectCommand({
        //     Bucket: appConfig.s3Bucket,
        //     Key: `${id}.json`,
        //     Body: JSON.stringify(metadata),
        //     ContentType: 'application/json',
        //     ACL: 'public-read',
        //   }),
        // );
    }

    async deleteNftMetadata(
        txHash: string,
        logIndex: number,
        owner: string,
        id: number,
    ) {
        let user = await this.findOrCreateUser(owner);

        const nft = await this.nftRepo.findOne({
            where: { id },
        });

        const star = this.getStarCountForNftId(nft.nftId);

        const _idx = BigNumber.from(logIndex).toNumber();

        const log = await this.txnLogRepo.findOne({
            where: {
                txHash,
                logIndex: _idx,
                event: 'NFTBurned',
            },
        });

        if (log) return;

        if (nft) {
            await this.txnLogRepo.save({
                txHash,
                logIndex: _idx,
                event: 'NFTBurned',
            });

            user.numOfFlip = star;
            user.burnedNft = nft;
            await this.userRepo.save(user);
            await this.cardRepo.delete({ user: user });

            const zero = await this.findOrCreateUser(
                ethers.constants.AddressZero,
            );
            await this.nftRepo.update(
                { id: nft.id },
                {
                    owner: zero,
                },
            );

            const randNftIds = this.randomFromStar(star);

            const newCards = randNftIds.map((_id, idx) => {
                const card = new Card();
                card.cardId = idx;
                card.nftId = _id;
                card.user = user;
                card.flipped = false;
                card.reward = '0';
                return card;
            });

            await this.cardRepo.save(newCards);
        }

        // TODO
        // const exists = await this.checkExistS3File(`${id}.json`);
        // if (!exists) return;

        // return this.s3Client.send(
        //   new DeleteObjectCommand({
        //     Bucket: appConfig.s3Bucket,
        //     Key: `${id}.json`,
        //   }),
        // );

        return star;
    }

    async nftTransferOwner(newOwner: string, id: number) {
        const user = await this.findOrCreateUser(newOwner);
        return this.nftRepo.update(
            { id },
            {
                owner: user,
            },
        );
    }

    async findOrCreateUser(id: string) {
        let user = await this.userRepo.findOne({
            where: { id: id.toLowerCase() },
            relations: {
                burnedNft: true,
            },
        });

        if (!user) {
            user = new User();
            user.id = id.toLowerCase();
            user.rewarded = '0';
            user.numOfFlip = 0;
            await this.userRepo.save(user);
        }

        return user;
    }

    withdrawClaimTime(time: number, orderType: number) {
        let add: number = 0;
        if (orderType === 1) add = 86400;
        if (orderType === 2) add = 259200;
        return time + add;
    }

    async createWithdraw(
        account: string,
        orderType: BigNumber,
        orderId: BigNumber,
        amount: BigNumber,
        time: number,
    ) {
        const user = await this.findOrCreateUser(account);
        let withdraw = await this.withdrawRepo.findOne({
            where: {
                withdrawId: orderId.toNumber(),
            },
        });

        if (withdraw) return withdraw;

        withdraw = new Withdraw();
        withdraw.orderType = orderType.toNumber();
        withdraw.owner = user;
        withdraw.withdrawId = orderId.toNumber();
        withdraw.amount = ethers.utils.formatEther(amount);
        withdraw.claimTime = this.withdrawClaimTime(time, orderType.toNumber());
        await this.withdrawRepo.save(withdraw);

        return withdraw;
    }

    async claimWithdraw(orderId: BigNumber) {
        let withdraw = await this.withdrawRepo.update(
            {
                withdrawId: orderId.toNumber(),
            },
            {
                claimed: true,
            },
        );
        return withdraw;
    }

    private async checkExistS3File(key: string) {
        try {
            const exists = await this.s3Client.send(
                new HeadObjectCommand({
                    Bucket: appConfig.s3Bucket,
                    Key: key,
                }),
            );
            return exists.$metadata.httpStatusCode == 200;
        } catch (error) {
            return undefined;
        }
    }

    private randomNftForGrade(grade: number): number {
        // 10 gold (5 star), 10 ruby (4 star), 10 amethyst (3 star), 10 emerald (2 star), 160 silver (1 star)
        const starSelector = Math.floor(Math.random() * 100) + 1;
        let stars = 0;

        if (grade === 0) {
            // bronze box - 60% 1 star, 20% 2 star, 14% 3 star, 5% 4 star, 1% 5 star
            if (starSelector <= 60) {
                stars = 1;
            } else if (starSelector <= 80) {
                stars = 2;
            } else if (starSelector <= 94) {
                stars = 3;
            } else if (starSelector <= 99) {
                stars = 4;
            } else {
                stars = 5;
            }
        } else if (grade === 1) {
            // silver box - 50% 1 star, 26% 2 star, 15% 3 star, 7% 4 star, 2% 5 star
            if (starSelector <= 50) {
                stars = 1;
            } else if (starSelector <= 76) {
                stars = 2;
            } else if (starSelector <= 91) {
                stars = 3;
            } else if (starSelector <= 98) {
                stars = 4;
            } else {
                stars = 5;
            }
        } else if (grade === 2) {
            // gold box - 40% 1 star, 30% 2 star, 16% 3 star, 10% 4 star, 4% 5 star
            if (starSelector <= 40) {
                stars = 1;
            } else if (starSelector <= 70) {
                stars = 2;
            } else if (starSelector <= 86) {
                stars = 3;
            } else if (starSelector <= 96) {
                stars = 4;
            } else {
                stars = 5;
            }
        }

        let id = 0;
        if (stars === 1) {
            id = Math.floor(Math.random() * 160) + 41;
        } else if (stars === 2) {
            id = Math.floor(Math.random() * 10) + 31;
        } else if (stars === 3) {
            id = Math.floor(Math.random() * 10) + 21;
        } else if (stars === 4) {
            id = Math.floor(Math.random() * 10) + 11;
        } else if (stars === 5) {
            id = Math.floor(Math.random() * 10) + 1;
        }
        return id;
    }

    private getStarCountForNftId = (id: number): number => {
        if (1 <= id && id <= 10) {
            return 5;
        } else if (id <= 20) {
            return 4;
        } else if (id <= 30) {
            return 3;
        } else if (id <= 40) {
            return 2;
        }
        return 1;
    };

    private shuffle(a: any[]): any[] {
        var j, x, i;
        for (i = a.length - 1; i > 0; i--) {
            j = Math.floor(Math.random() * (i + 1));
            x = a[i];
            a[i] = a[j];
            a[j] = x;
        }
        return a;
    }

    private randomFromStar = (start: number): number[] => {
        let nftSameStartIds = new Array(10).fill('').map((_, idx) => idx + 1);
        if (start === 4) {
            nftSameStartIds = new Array(10).fill('').map((_, idx) => idx + 11);
        } else if (start === 3) {
            nftSameStartIds = new Array(10).fill('').map((_, idx) => idx + 21);
        } else if (start === 2) {
            nftSameStartIds = new Array(10).fill('').map((_, idx) => idx + 31);
        } else if (start === 1) {
            nftSameStartIds = new Array(160).fill('').map((_, idx) => idx + 41);
        }

        let nftDiffStarIds = new Array(200)
            .fill('')
            .map((_, idx) => idx + 1)
            .filter((num) => !nftSameStartIds.includes(num));

        let result = [];
        for (let i = 0; i < 5; i++) {
            let rand = Math.floor(Math.random() * nftSameStartIds.length);

            result.push(nftSameStartIds[rand]);
            nftSameStartIds = [
                ...nftSameStartIds.slice(0, rand),
                ...nftSameStartIds.slice(rand + 1, nftSameStartIds.length),
            ];
        }

        for (let i = 0; i < 45; i++) {
            let rand = Math.floor(Math.random() * nftDiffStarIds.length);
            result.push(nftDiffStarIds[rand]);
            // nftDiffStarIds = [
            //   ...nftDiffStarIds.slice(0, rand),
            //   ...nftDiffStarIds.slice(rand + 1, nftDiffStarIds.length),
            // ];
        }

        return this.shuffle(result);
    };
}

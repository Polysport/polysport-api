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
import { Repository } from 'typeorm';
import * as Erc20Abi from '../abis/erc20.json';
import * as PoolAbi from '../abis/pool.json';
import { appConfig } from '../app.config';
import {
  EWin,
  FLIP_MSG,
  ID_ATTRIBUTE_MAPPING,
  ID_PICTURE_MAPPING,
  WITHDRAW_MSG,
  randomRPC,
} from '../constants';
import { NFT, User } from '../db/entities';
import { Card } from '../db/entities/card.entity';
import { FlipDto } from './dto/flip.dto';
import { WithdrawDto } from './dto/withdraw.dto';

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

  getUserStats(account: string) {
    if (!account) return undefined;

    return this.userRepo.findOne({
      where: { id: account },
      relations: {
        burnedNft: true,
        nfts: true,
        cards: true,
      },
    });
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
    if (card) throw new BadRequestException('Card is flipped');

    const nftId = Math.floor(Math.random() * 200);


    const iface = this.web3Service.getContractInterface(PoolAbi);
    const pool = this.web3Service.getContract(
      appConfig.poolAddress,
      iface,
      this.web3Service.getSigner(appConfig.operatorPrivKey, randomRPC()),
    );

    const poolReward = await pool.getReward(appConfig.tokenAddress);

    let win: EWin = EWin.LOSE;

    let reward: BigNumber = BigNumber.from('0');
    if (nftId == user.burnedNft.nftId) {
      win = EWin.JACKPOT;
      reward = BigNumber.from('50').mul(poolReward).div(BigNumber.from('100'));
    } else if (
      this.getStarCountForNftId(nftId) ===
      this.getStarCountForNftId(user.burnedNft.nftId)
    ) {
      reward = BigNumber.from('2').mul(poolReward).div(BigNumber.from('100'));
      win = EWin.WIN;
    }

    user.numOfFlip--;
    if (!reward.eq(ethers.constants.Zero)) {
      user.rewarded = BigNumber.from(user.rewarded || '0')
        .add(reward)
        .toString();
    }

    await this.userRepo.save(user);

    await this.cardRepo.save({
      cardId: dto.cardId,
      user: user,
      flipped: true,
      nftId,
      reward: reward.toString(),
    });

    return pool.setRewarded(
      appConfig.tokenAddress,
      dto.account,
      reward,
    );
  }

  async withdraw(dto: WithdrawDto) {
    if (
      !this.web3Service.verifySignature(
        dto.account,
        dto.signature,
        `${WITHDRAW_MSG} ${dto.amount}`,
      )
    )
      throw new BadRequestException('Invalid signature');

    let user = await this.findOrCreateUser(dto.account);

    if (BigNumber.from(user.rewarded || '0').lt(BigNumber.from(dto.amount)))
      throw new BadRequestException('Insufficient amount to withdraw');

    const iface = this.web3Service.getContractInterface(PoolAbi);
    const pool = this.web3Service.getContract(
      appConfig.poolAddress,
      iface,
      this.web3Service.getSigner(appConfig.operatorPrivKey, randomRPC()),
    );

    user.rewarded = BigNumber.from(user.rewarded || '0')
      .sub(BigNumber.from(dto.amount))
      .toString();
    await this.userRepo.save(user);

    try {
      return pool.transferToken(
        appConfig.tokenAddress,
        dto.account,
        dto.amount,
      );
    } catch (error) {
      console.log(
        '🚀 ~ file: game.service.ts:161 ~ GameService ~ withdraw ~ error:',
        error,
      );
    }
  }

  async addNftMetadata(owner: string, id: number, grade: number) {
    const nftId = this.randomNftForGrade(grade);

    const exists = await this.checkExistS3File(`${id}.json`);
    if (exists) return;

    const nft = await this.nftRepo.findOne({ where: { id } });
    if (nft) return;

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

  async deleteNftMetadata(owner: string, id: number) {
    let user = await this.userRepo.findOne({
      where: { id: owner.toLowerCase() },
    });

    if (!user) {
      user = new User();
      user.id = owner.toLowerCase();
      user.rewarded = '0';
      user.numOfFlip = 0;
    }

    const exists = await this.checkExistS3File(`${id}.json`);
    if (!exists) return;

    const nft = await this.nftRepo.findOne({
      where: { id },
    });

    if (nft) {
      user.numOfFlip = this.getStarCountForNftId(nft.nftId);
      user.burnedNft = nft;
      await this.userRepo.save(user);
      await this.cardRepo.delete({ user: user });
    }

    // TODO
    // return this.s3Client.send(
    //   new DeleteObjectCommand({
    //     Bucket: appConfig.s3Bucket,
    //     Key: `${id}.json`,
    //   }),
    // );
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
      user.rewarded = '';
      user.numOfFlip = 0;
      await this.userRepo.save(user);
    }

    return user;
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
    if (id <= 10) {
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
}

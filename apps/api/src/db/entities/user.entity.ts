import {
  Column,
  Entity,
  OneToOne,
  PrimaryColumn,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { NFT } from './nft.entity';
import { Card } from './card.entity';
import { Withdraw } from './withdraw.entity';

@Entity()
export class User {
  @PrimaryColumn()
  id: string; // user address

  @Column()
  numOfFlip: number;

  @Column()
  rewarded: string;

  @OneToOne(() => NFT, { nullable: true })
  @JoinColumn()
  burnedNft: NFT;

  @OneToMany(() => Card, (card) => card.user)
  cards: Card[];

  @OneToMany(() => NFT, (nft) => nft.owner)
  nfts: NFT[];

  @OneToMany(() => Withdraw, (entity) => entity.owner)
  withdraws: Withdraw[];
}

import { Field, ID, Int, ObjectType } from '@nestjs/graphql';
import { Column, Entity, PrimaryColumn } from 'typeorm';
import { NFT } from './nft.entity';

@ObjectType()
@Entity()
export class User {
  @Field(() => ID)
  @PrimaryColumn()
  id: string; // user address

  @Field(() => String)
  numOfFlip: string;

  @Field(() => String)
  @Column()
  rewarded: string;

  @Field(() => Int)
  burnedNft: NFT;
}

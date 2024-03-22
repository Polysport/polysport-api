import { Field, ID, Int, ObjectType } from '@nestjs/graphql';
import { Column, Entity, PrimaryColumn } from 'typeorm';

@ObjectType()
@Entity()
export class Pool {
  @Field(() => ID)
  @PrimaryColumn()
  id: string; // user address

  @Field(() => String)
  @Column()
  rewarded: string;

  @Field(() => String)
  @Column()
  reward: string;

  @Field(() => Int)
  @Column()
  burnedNftId: number;
}

import { Field, ID, ObjectType } from '@nestjs/graphql';
import { Column, Entity, PrimaryColumn } from 'typeorm';

@ObjectType()
@Entity()
export class Card {
  @Field(() => ID)
  @PrimaryColumn()
  id: string; // user address

  @Field(() => String)
  @Column()
  rewarded: string;

  @Field(() => String)
  @Column()
  reward: string;

  @Field(() => String)
  @Column({ name: 'num_of_flip' })
  numOfFlip: string;
}

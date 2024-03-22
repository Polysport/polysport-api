import { Field, ID, ObjectType } from '@nestjs/graphql';
import { Column, Entity, PrimaryColumn } from 'typeorm';

@ObjectType()
@Entity()
export class NFT {
  @Field(() => ID)
  @PrimaryColumn()
  id: string;

  @Field(() => String)
  @Column()
  owner: string;

  @Field(() => String)
  @Column()
  description: string;

  @Field(() => String)
  @Column()
  name: string;

  @Field(() => String)
  @Column()
  attributes: string;

  @Field(() => String)
  @Column()
  image: string;

  @Field(() => String)
  @Column()
  uri: string;
}

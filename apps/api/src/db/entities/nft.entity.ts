import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { User } from './user.entity';

@Entity()
export class NFT {
  @PrimaryColumn()
  id: number;

  @ManyToOne(() => User, (user) => user.nfts, { nullable: true })
  @JoinColumn({ foreignKeyConstraintName: 'owner' })
  owner: User;

  @Column()
  nftId: number;

  @Column()
  description: string;

  @Column()
  name: string;

  @Column()
  attributes: string;

  @Column()
  image: string;

  @Column()
  uri: string;
}

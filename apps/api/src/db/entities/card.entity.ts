import {
  Column,
  Entity,
  ManyToOne,
  PrimaryColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity()
export class Card {
  @PrimaryGeneratedColumn()
  id: string;

  @Column()
  cardId: number;

  @ManyToOne(() => User, (photo) => photo.cards)
  user: User;

  @Column()
  flipped: boolean;

  @Column({ nullable: true })
  userFlipped: boolean;

  @Column()
  nftId: number;

  @Column()
  reward: string;
}

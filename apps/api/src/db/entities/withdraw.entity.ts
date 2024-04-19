import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { User } from './user.entity';

@Entity()
export class Withdraw {
  @PrimaryGeneratedColumn()
  id: string;

  @Column()
  withdrawId: number;

  @ManyToOne(() => User, (user) => user.withdraws)
  owner: User;

  @Column()
  amount: number;

  @Column()
  orderType: number;

  @Column()
  claimTime: number;

  @Column({ default: false })
  claimed: boolean;
}

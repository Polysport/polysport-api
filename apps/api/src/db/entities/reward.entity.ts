import {
    Column,
    CreateDateColumn,
    Entity,
    ManyToOne,
    PrimaryColumn,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';
import { User } from './user.entity';
import { ERewardStatus } from '../../types';

@Entity()
export class Reward {
    @PrimaryGeneratedColumn()
    id: string;

    @Column()
    cardId: number;

    @ManyToOne(() => User, (entity) => entity.rewards)
    user: User;

    @Column()
    nftId: number;

    @Column()
    reward: string;

    @Column({ enum: ERewardStatus, default: ERewardStatus.processing })
    status: string;

    @CreateDateColumn({ type: 'timestamp' })
    createdAt: Date;

    @UpdateDateColumn({ type: 'timestamp' })
    updatedAt: Date;
}

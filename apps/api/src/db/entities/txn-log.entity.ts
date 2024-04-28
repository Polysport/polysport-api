import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class TxnLog {
    @PrimaryGeneratedColumn()
    id: string;

    @Column()
    txHash: string;

    @Column()
    logIndex: number;

    @Column()
    event: string;
}

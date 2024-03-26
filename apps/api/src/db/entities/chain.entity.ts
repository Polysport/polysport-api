import { Entity, Column, PrimaryColumn } from 'typeorm';

@Entity()
export class Chain {
  @PrimaryColumn()
  id: string;

  @Column()
  blockNumber: number;

  @Column()
  reward: number;
}

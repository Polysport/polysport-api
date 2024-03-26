import { Module } from '@nestjs/common';
import { GameService } from './game.service';
import { GameController } from './game.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NFT, User } from '../db/entities';
import { Card } from '../db/entities/card.entity';
import { HttpModule } from '@nestjs/axios';
import { Web3Module } from '@lib/web3';

@Module({
  imports: [
    HttpModule,
    Web3Module,
    TypeOrmModule.forFeature([NFT, User, Card]),
  ],
  providers: [GameService],
  controllers: [GameController],
  exports: [GameService],
})
export class GameModule {}

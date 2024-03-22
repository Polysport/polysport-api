import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Chain, NFT } from '../db/entities';

@Module({
  imports: [TypeOrmModule.forFeature([Chain, NFT])],
  providers: [],
})
export class ResolverModule {}

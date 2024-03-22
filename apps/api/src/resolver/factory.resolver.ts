// import { Args, Query, Resolver } from '@nestjs/graphql';
// import { Factory } from '../db/entities';
// import { NotFoundException } from '@nestjs/common';
// import { InjectRepository } from '@nestjs/typeorm';
// import { Repository } from 'typeorm';
// import { CHAIN, FACTORY_ADDRESS } from '../constants';

// @Resolver(() => Factory)
// export class FactoryResolver {
//   constructor(
//     @InjectRepository(Factory)
//     private factoryRepo: Repository<Factory>,
//   ) {}

//   @Query((returns) => Factory)
//   async factory(): Promise<Factory> {
//     const factory = await this.factoryRepo.findOneBy({
//       id: FACTORY_ADDRESS[CHAIN],
//     });
//     if (!factory) {
//       throw new NotFoundException();
//     }
//     return factory;
//   }
// }

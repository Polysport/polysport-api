import { Web3Service } from '@lib/web3';
import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { ethers } from 'ethers';
import * as NftAbi from '../abis/nft.json';
import { INDEXER_PROCESS_NAME, INDEXER_QUEUE_NAME, TOPIC0 } from '../constants';
import { GameService } from '../game/game.service';

@Processor(INDEXER_QUEUE_NAME)
export class IndexerConsumer {
  constructor(
    private readonly web3Service: Web3Service,
    private gameService: GameService,
  ) {}

  @Process(INDEXER_PROCESS_NAME)
  async processEvents(job: Job<{ logs: ethers.providers.Log[] }>) {
    const nftIface = this.web3Service.getContractInterface(NftAbi);

    const length = job.data.logs.length;
    for (let i = 0; i < length; i++) {
      const log = job.data.logs[i];

      if (log.topics[0] === TOPIC0.mint) {
        const event = nftIface.decodeEventLog(
          'NFTMinted',
          log.data,
          log.topics,
        );
        await this.gameService.addNftMetadata(
          event.purchaser.toLowerCase(),
          event.id.toNumber(),
          event.grade.toNumber(),
        );
      } else if (log.topics[0] === TOPIC0.burn) {
        const event = nftIface.decodeEventLog(
          'NFTBurned',
          log.data,
          log.topics,
        );
        await this.gameService.deleteNftMetadata(
          event.owner.toLowerCase(),
          event.id.toNumber(),
        );
      } else if (log.topics[0] === TOPIC0.transfer) {
        const event = nftIface.decodeEventLog('Transfer', log.data, log.topics);
        await this.gameService.nftTransferOwner(
          event.to.toLowerCase(),
          event.tokenId.toNumber(),
        );
      }
    }
  }
}

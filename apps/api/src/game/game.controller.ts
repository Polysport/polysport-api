import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { GameService } from './game.service';
import { FlipDto } from './dto/flip.dto';
import { WithdrawDto } from './dto/withdraw.dto';

@Controller('game')
export class GameController {
    constructor(private gameService: GameService) {}

    @Get('/stats')
    getNfts(@Query('account') account: string) {
        return this.gameService.getUserStats(account.toLowerCase());
    }

    @Get('/leader-board/nft')
    getLeaderBoardNft() {
        return this.gameService.getLeaderBoardNft();
    }

    @Get('/leader-board/rewarded')
    getLeaderBoardRewarded() {
        return this.gameService.getLeaderBoardRewarded();
    }

    @Post('/flip')
    flip(@Body() dto: FlipDto) {
        return this.gameService.flip(dto);
    }

    // @Post('/withdraw')
    // withdraw(@Body() dto: WithdrawDto) {
    //   return this.gameService.withdraw(dto);
    // }
}

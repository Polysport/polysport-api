import { Transform } from 'class-transformer';
import { IsNotEmpty, IsNumber } from 'class-validator';

export class BurnDto {
    @IsNotEmpty()
    txHash: string;
}

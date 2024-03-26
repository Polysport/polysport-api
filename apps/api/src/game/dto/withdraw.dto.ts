import { Transform } from 'class-transformer';
import { IsNotEmpty, IsNumber } from 'class-validator';

export class WithdrawDto {
  @IsNotEmpty()
  @Transform(({ value }) => value.toLowerCase())
  account: string;

  @IsNotEmpty()
  signature: string;

  @IsNotEmpty()
  amount: string;
}

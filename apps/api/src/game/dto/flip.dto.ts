import { Transform } from 'class-transformer';
import { IsNotEmpty, IsNumber } from 'class-validator';

export class FlipDto {
  @IsNotEmpty()
  @Transform(({ value }) => value.toLowerCase())
  account: string;

  @IsNotEmpty()
  signature: string;

  @IsNotEmpty()
  @IsNumber()
  cardId: number;
}

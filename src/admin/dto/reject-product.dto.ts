import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class RejectProductDto {
  @ApiProperty({
    example: 'The product images do not clearly show the item.',
    description: 'Reason for rejecting the product',
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(3)
  reason: string;
}

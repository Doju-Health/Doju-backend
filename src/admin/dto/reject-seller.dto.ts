import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class RejectSellerDto {
  @ApiProperty({
    example: 'Submitted documents were blurry',
    description: 'Reason for rejecting seller KYC',
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(3)
  reason: string;
}

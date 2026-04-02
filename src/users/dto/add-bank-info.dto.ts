import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class AddBankInfoDto {
  @ApiProperty({
    description: 'Bank account number',
    example: '0123456789',
  })
  @IsNotEmpty()
  @IsString()
  accountNumber: string;

  @ApiProperty({
    description: 'Bank code (e.g., 044)',
    example: '044',
  })
  @IsNotEmpty()
  @IsString()
  bankCode: string;

  @ApiProperty({
    description: 'Account name',
    example: 'John Doe',
  })
  @IsNotEmpty()
  @IsString()
  accountName: string;
}

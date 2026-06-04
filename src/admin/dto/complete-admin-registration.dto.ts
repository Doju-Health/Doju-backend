import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, MinLength } from 'class-validator';

export class CompleteAdminRegistrationDto {
  @ApiProperty({ example: 'new.admin@dojuhealth.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'SecurePass123' })
  @MinLength(8)
  password: string;
}

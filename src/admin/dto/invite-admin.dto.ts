import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, IsNotEmpty} from 'class-validator';

export class InviteAdminDto {
  @ApiProperty({ example: 'new.admin@dojuhealth.com' })
  @IsEmail()
  email: string;

  @ApiProperty ({ example: "Queen Admin"})
  @IsNotEmpty()
  @IsString()
  fullName: string;
}

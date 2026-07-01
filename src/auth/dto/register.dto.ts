import { IsEmail, IsIn, IsNotEmpty, IsOptional, MinLength } from 'class-validator';
import { UserRole } from 'src/users/enums/user.enum';

export class RegisterDto {
    @IsNotEmpty()
    fullName: string;

    @IsEmail()
    email: string;

    @MinLength(8)
    password: string;

    @IsIn([UserRole.BUYER, UserRole.SELLER])
    role: UserRole

    @IsNotEmpty()
    phoneNumber: string;

    @IsOptional()
    address: string;

    @IsOptional()
    country: string;

    @IsOptional()
    BusinessName?: string;
}

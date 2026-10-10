import { IsEmail, IsEnum, IsIn, IsNotEmpty, IsOptional, Matches, ValidateIf } from 'class-validator';
import { SellerType, UserRole } from 'src/users/enums/user.enum';

export class RegisterDto {
    @IsNotEmpty()
    fullName: string;

    @IsEmail()
    email: string;

    @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/, {
        message: 'Password must be at least 8 characters long and contain uppercase and lowercase letters, a number, and a special character',
    })
    password: string;

    @IsIn([UserRole.BUYER, UserRole.SELLER])
    role: UserRole

    @ValidateIf((dto: RegisterDto) => dto.role === UserRole.SELLER)
    @IsEnum(SellerType)
    sellerType?: SellerType;

    @IsNotEmpty()
    phoneNumber: string;

    @IsOptional()
    address: string;

    @IsOptional()
    country: string;

    @IsOptional()
    BusinessName?: string;
}

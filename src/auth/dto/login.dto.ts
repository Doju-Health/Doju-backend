import { IsEmail, IsEnum, IsString, MinLength } from "class-validator";
import { UserRole } from "src/users/enums/user.enum";

export class LoginDto {

    @IsEmail()
    email: string;

    // @IsEnum(UserRole)
    // role: UserRole

    @IsString()
    @MinLength(6)
    password: string;
}
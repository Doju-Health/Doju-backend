// import { Injectable, Logger } from '@nestjs/common';
// import { PassportStrategy } from '@nestjs/passport';
// import { ExtractJwt, Strategy } from 'passport-jwt';
// import { AuthService } from '../auth.service';

// @Injectable()
// export class JwtStrategy extends PassportStrategy(Strategy) {
//   private readonly logger = new Logger(JwtStrategy.name);

//   constructor(private authService: AuthService) {
//     super({
//       jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
//       secretOrKey: process.env.JWT_SECRET || '4bd0ab0a01b0a47a149a42697f7ca1d6f3e62bebfac2d87b15352454a5afd5b3',
//       ignoreExpiration: false,
//     });
//   }

//   async validate(payload: any) {
//     this.logger.debug(`Validating JWT payload: ${JSON.stringify(payload)}`);
//     const user = await this.authService.validateUser(payload);
//     this.logger.debug(`User validated: ${user.id}`);
//     return user;
//   }
// }

import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { ConfigService } from '@nestjs/config';
import { VerificationStatus } from 'src/users/enums/user.enum';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly configService: ConfigService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: configService.get('JWT_SECRET'),
    });
  }

  async validate(payload: any) {
    this.logger.debug(`JWT payload: ${JSON.stringify(payload)}`);

    const user = await this.userRepo.findOne({
      where: { id: payload.sub },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException();
    }

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      fullName: user.fullName,
      address: user.address,
      city: user.city,
      state: user.state,
      phoneNumber: user.phoneNumber,
      businessCity: user.businessCity,
      businessState: user.businessState,
      isVerified: user.isVerified ?? VerificationStatus.UNVERIFIED,
    };
  }
}

import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { EmailModule } from './email/email.module';
import { AuthModule } from './auth/auth.module';
import { ProductsModule } from './products/products.module';
import { OrdersModule } from './orders/orders.module';
import { CommonModule } from './common/common.module';
import { PaymentsModule } from './payment/payment.module';
import { ScheduleModule } from '@nestjs/schedule';
import { CartModule } from './cart/cart.module';
import { TrackingModule } from './tracking/tracking.module';
import { SellerDashboardModule } from './seller-dashboard/seller-dashboard.module';
import { AdminModule } from './admin/admin.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const isProduction = configService.get('NODE_ENV') === 'production';

        return {
          type: 'postgres',
          url: configService.get<string>('DATABASE_URL'),
          autoLoadEntities: true,
          synchronize: false,
          ssl: isProduction ? { rejectUnauthorized: false } : false,
        };
      },
    }),

    UsersModule,
    EmailModule,
    AuthModule,
    ProductsModule,
    OrdersModule,
    CommonModule,
    ScheduleModule.forRoot(),
    PaymentsModule,
    CartModule,
    TrackingModule,
    SellerDashboardModule,
    AdminModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

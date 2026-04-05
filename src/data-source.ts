import 'dotenv/config';
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { User } from './users/entities/user.entity';
import { Product } from './products/entities/product-entity';
import { ProductCategory } from './products/entities/product-category.entity';
import { Order } from './orders/entities/order.entity';
import { Payment } from './payment/entities/payment.entity';
import { CartItem } from './cart/entities/cart-item.entity';
import { OrderTracking } from './tracking/entities/tracking.entity';
import { WaitlistEntry } from './waitlist/entities/waitlist-entry.entity';

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: [User, Product, ProductCategory, Order, Payment, CartItem, OrderTracking, WaitlistEntry],
  migrations: ['dist/migrations/*.js'],
  synchronize: false,
  schema: 'public',
});

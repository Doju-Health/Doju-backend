import 'dotenv/config';
import 'reflect-metadata';
import { DataSource } from 'typeorm';

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: ['dist/**/*.entity.ts'],      
  migrations: ['dist/migrations/*.ts'],   
  synchronize: false,
  schema: 'public',
});
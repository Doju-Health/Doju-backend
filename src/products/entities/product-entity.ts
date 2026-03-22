import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity'
// import { User } from 'src/users/entities/user.entity';
import { ProductCategory } from './product-category.entity';

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column('text')
  description: string;

  @Column('decimal')
  price: number;

  @Column()
  stock: number;

  @Column('text', { array: true, nullable: true })
  imageUrl?: string[];

  @ManyToOne(() => User, { eager: true })
  seller: User;

  @ManyToOne(() => ProductCategory, { eager: true })
  category: ProductCategory;

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: false })
  isApproved: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

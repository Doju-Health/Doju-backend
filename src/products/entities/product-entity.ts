import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
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

  @Column({
    type: 'enum',
    enumName: 'products_size_enum',
    enum: ['small', 'medium', 'large'],
    default: 'small',
  })
  size: 'small' | 'medium' | 'large';

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

  @Column('decimal', { precision: 3, scale: 2, default: 0 })
  averageRating: number;

  @Column({ default: 0 })
  ratingsCount: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

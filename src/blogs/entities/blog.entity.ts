import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum BlogStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
}

@Entity({ name: 'blogs' })
export class Blog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  slug: string;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  excerpt?: string | null;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'varchar', nullable: true })
  coverImageUrl?: string | null;

  @Column({
    type: 'enum',
    enum: BlogStatus,
    enumName: 'blog_status_enum',
    default: BlogStatus.DRAFT,
  })
  status: BlogStatus;

  @Column({ type: 'timestamp', nullable: true })
  publishedAt?: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

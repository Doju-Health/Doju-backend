import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('student_ambassadors')
export class Ambassador {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  fullName: string;

  @Column({ unique: true })
  email: string;

  @Column()
  phone: string;

  @Column()
  state: string;

  @Column()
  institution: string;

  @Column()
  courseDepartment: string;

  @Column()
  level: string;

  @Column({ type: 'jsonb' })
  socialMediaHandles: Record<string, string>;

  @Column('text')
  promotionPlan: string;

  @Column('text')
  promotionNotes: string;

  @Column({ unique: true })
  studentMatricNo: string;

  @Column('text', { nullable: true })
  idCardUrl: string | null;

  @Column({ type: 'varchar', nullable: true })
  idCardPublicId: string | null;

  @Column({ type: 'varchar', nullable: true })
  idCardFormat: string | null;

  @Column({ type: 'varchar', nullable: true })
  idCardResourceType: string | null;

  @Column({ default: 'pending' })
  status: string;

  @Column({ nullable: true, unique: true })
  referralCode?: string;

  @Column('text', { nullable: true })
  referralLink?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

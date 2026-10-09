import { Entity, PrimaryGeneratedColumn, Column, UpdateDateColumn } from 'typeorm';

@Entity()
export class Agent {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  fullName: string;

  @Column({ unique: true })
  email: string;

  @Column()
  phone: string;

  @Column()
  state: string;

  @Column()
  occupation: string;

  @Column('jsonb')
  socialMediaHandles: Record<string, string>;

  @Column()
  promotionPlan: string;

  @Column()
  promotionNotes: string;

  @Column()
  nin: string;

  @Column()
  motivation: string;

  @Column()
  coverageAreas: string;

@Column()
identityDocument: string;

  @Column({ default: 'pending' })
  status: string;

  @Column({ nullable: true, unique: true })
  referralCode?: string;

  @Column('text', { nullable: true })
  referralLink?: string;

  @UpdateDateColumn()
  updatedAt: Date;
}

import { Entity, PrimaryColumn, Column, UpdateDateColumn } from 'typeorm';

@Entity()
export class Agent {
  @PrimaryColumn({ type: 'int' })
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

@Column({ type: 'varchar', nullable: true })
identityDocument: string | null;

@Column({ type: 'varchar', nullable: true })
identityDocumentFormat: string | null;

@Column({ type: 'varchar', nullable: true })
identityDocumentResourceType: string | null;

  @Column({ default: 'pending' })
  status: string;

  @Column({ nullable: true, unique: true })
  referralCode?: string;

  @Column('text', { nullable: true })
  referralLink?: string;

  @UpdateDateColumn()
  updatedAt: Date;
}

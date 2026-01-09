import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

export type AuditStatus = 'ALLOW' | 'DENY';

@Entity()
export class AuditLog {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  action!: string;

  @Column({ type: 'text' })
  status!: AuditStatus;

  @Column({ nullable: true })
  userId?: number;

  @Column({ nullable: true })
  organizationId?: number;

  @Column({ nullable: true })
  resourceType?: string;

  @Column({ nullable: true })
  resourceId?: number;

  @Column({ type: 'text', nullable: true })
  reason?: string;

  @Column({ type: 'text', nullable: true })
  details?: string;

  @CreateDateColumn()
  createdAt!: Date;
}

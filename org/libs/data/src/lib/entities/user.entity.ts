import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, Index } from 'typeorm';
import { Organization } from './organization.entity.js';

export type Role = 'owner' | 'admin' | 'viewer';

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id!: number;

  @Index({ unique: true })
  @Column()
  email!: string;

  @Column()
  passwordHash!: string;

  @Column({ type: 'text', default: 'viewer' })
  role!: Role;

  @ManyToOne(() => Organization, { eager: true })
  organization!: Organization;
}

import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Organization } from './organization.entity.js';
import { User } from './user.entity.js';

export type TaskStatus = 'todo' | 'in-progress' | 'done';

@Entity()
export class Task {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  title!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'text', default: 'todo' })
  status!: TaskStatus;

  @Column({ type: 'text', default: 'general' })
  category!: string;

  @Column({ type: 'integer', default: 0 })
  position!: number;

  @ManyToOne(() => Organization, { eager: true })
  organization!: Organization;

  @ManyToOne(() => User, { eager: true })
  owner!: User;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}

import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, Index } from 'typeorm';

@Entity()
export class Organization {
  @PrimaryGeneratedColumn()
  id!: number;

  @Index()
  @Column()
  name!: string;

  @ManyToOne(() => Organization, (org) => org.children, { nullable: true })
  parent?: Organization | null;

  @OneToMany(() => Organization, (org) => org.parent)
  children!: Organization[];
}

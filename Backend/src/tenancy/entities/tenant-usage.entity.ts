import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Tenant } from './tenant.entity';

@Entity('tenant_usages')
export class TenantUsage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  metric: string;

  @Column({ type: 'bigint' })
  value: number;

  @Column({ type: 'json', nullable: true })
  metadata?: Record<string, any>;

  @Column({ type: 'timestamp', nullable: true })
  periodStart?: Date;

  @Column({ type: 'timestamp', nullable: true })
  periodEnd?: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => Tenant, (tenant) => tenant.usages)
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ name: 'tenant_id' })
  tenantId: string;
}

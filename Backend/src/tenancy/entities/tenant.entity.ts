import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { TenantConfig } from './tenant-config.entity';
import { TenantUsage } from './tenant-usage.entity';
import { TenantInvitation } from './tenant-invitation.entity';
import { User } from '../../auth/entities/user.entity';

@Entity('tenants')
export class Tenant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string;

  @Column({ unique: true })
  subdomain: string;

  @Column({ unique: true, nullable: true })
  customDomain?: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({
    type: 'enum',
    enum: ['active', 'inactive', 'suspended', 'trial'],
    default: 'trial',
  })
  status: string;

  @Column({ default: false })
  isPremium: boolean;

  @Column({ type: 'json', default: {} })
  metadata: Record<string, any>;

  @Column({ type: 'json', default: {} })
  settings: Record<string, any>;

  @Column({ type: 'json', default: {} })
  features: Record<string, boolean>;

  @Column({ type: 'json', default: {} })
  limits: Record<string, number>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @OneToMany(() => TenantConfig, (tenantConfig) => tenantConfig.tenant)
  configs: TenantConfig[];

  @OneToMany(() => TenantUsage, (tenantUsage) => tenantUsage.tenant)
  usages: TenantUsage[];

  @OneToMany(
    () => TenantInvitation,
    (tenantInvitation) => tenantInvitation.tenant,
  )
  invitations: TenantInvitation[];

  @OneToMany(() => User, (user) => user.tenantId)
  users: User[];
}

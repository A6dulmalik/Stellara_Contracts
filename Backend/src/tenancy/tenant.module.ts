import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TenantService } from './tenant.service';
import { TenantController } from './tenant.controller';
import { TenantIsolationService } from './services/tenant-isolation.service';
import { Tenant } from './entities/tenant.entity';
import { TenantConfig } from './entities/tenant-config.entity';
import { TenantUsage } from './entities/tenant-usage.entity';
import { TenantInvitation } from './entities/tenant-invitation.entity';
import { User } from '../auth/entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Tenant,
      TenantConfig,
      TenantUsage,
      TenantInvitation,
      User,
    ]),
  ],
  controllers: [TenantController],
  providers: [TenantService, TenantIsolationService],
  exports: [TenantService, TenantIsolationService], // Export services for other modules to use
})
export class TenantModule {}

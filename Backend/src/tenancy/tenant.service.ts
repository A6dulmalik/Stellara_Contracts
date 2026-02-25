import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Tenant } from './entities/tenant.entity';
import { TenantConfig } from './entities/tenant-config.entity';
import { TenantUsage } from './entities/tenant-usage.entity';
import { TenantInvitation } from './entities/tenant-invitation.entity';

@Injectable()
export class TenantService {
  constructor(
    @InjectRepository(Tenant)
    private tenantRepository: Repository<Tenant>,
    @InjectRepository(TenantConfig)
    private tenantConfigRepository: Repository<TenantConfig>,
    @InjectRepository(TenantUsage)
    private tenantUsageRepository: Repository<TenantUsage>,
    @InjectRepository(TenantInvitation)
    private tenantInvitationRepository: Repository<TenantInvitation>,
    private dataSource: DataSource,
  ) {}

  /**
   * Create a new tenant with initial configuration
   */
  async createTenant(createTenantDto: {
    name: string;
    subdomain: string;
    customDomain?: string;
    description?: string;
    ownerId?: string;
  }): Promise<Tenant> {
    // Check if subdomain or name already exists
    const existingTenant = await this.findBySubdomain(createTenantDto.subdomain);
    if (existingTenant) {
      throw new ConflictException(`Tenant with subdomain ${createTenantDto.subdomain} already exists`);
    }

    const tenant = new Tenant();
    tenant.name = createTenantDto.name;
    tenant.subdomain = createTenantDto.subdomain;
    tenant.customDomain = createTenantDto.customDomain;
    tenant.description = createTenantDto.description;
    tenant.status = 'active';
    tenant.isPremium = false;
    tenant.metadata = {};
    tenant.settings = {};
    tenant.features = {};
    tenant.limits = {};

    return await this.tenantRepository.save(tenant);
  }

  /**
   * Find tenant by ID
   */
  async findById(id: string): Promise<Tenant | null> {
    const tenant = await this.tenantRepository.findOne({
      where: { id },
    });

    return tenant;
  }

  /**
   * Find tenant by subdomain
   */
  async findBySubdomain(subdomain: string): Promise<Tenant | null> {
    return await this.tenantRepository.findOne({
      where: { subdomain },
    });
  }

  /**
   * Find tenant by custom domain
   */
  async findByCustomDomain(customDomain: string): Promise<Tenant | null> {
    if (!customDomain) return null;
    
    return await this.tenantRepository.findOne({
      where: { customDomain },
    });
  }

  /**
   * Get all tenants
   */
  async findAll(): Promise<Tenant[]> {
    return await this.tenantRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Update tenant
   */
  async update(id: string, updateTenantDto: Partial<Tenant>): Promise<Tenant> {
    const tenant = await this.findById(id);
    if (!tenant) {
      throw new NotFoundException(`Tenant with ID ${id} not found`);
    }
    
    // Update allowed fields only
    if (updateTenantDto.name) tenant.name = updateTenantDto.name;
    if (updateTenantDto.subdomain) tenant.subdomain = updateTenantDto.subdomain;
    if (updateTenantDto.customDomain !== undefined) tenant.customDomain = updateTenantDto.customDomain;
    if (updateTenantDto.description !== undefined) tenant.description = updateTenantDto.description;
    if (updateTenantDto.status) tenant.status = updateTenantDto.status;
    if (updateTenantDto.isPremium !== undefined) tenant.isPremium = updateTenantDto.isPremium;
    if (updateTenantDto.metadata !== undefined) tenant.metadata = updateTenantDto.metadata;
    if (updateTenantDto.settings !== undefined) tenant.settings = updateTenantDto.settings;
    if (updateTenantDto.features !== undefined) tenant.features = updateTenantDto.features;
    if (updateTenantDto.limits !== undefined) tenant.limits = updateTenantDto.limits;

    return await this.tenantRepository.save(tenant);
  }

  /**
   * Deactivate tenant
   */
  async deactivate(id: string): Promise<Tenant> {
    return await this.update(id, { status: 'inactive' });
  }

  /**
   * Activate tenant
   */
  async activate(id: string): Promise<Tenant> {
    return await this.update(id, { status: 'active' });
  }

  /**
   * Delete tenant (soft delete in real implementation)
   */
  async delete(id: string): Promise<void> {
    const tenant = await this.findById(id);
    if (!tenant) {
      throw new NotFoundException(`Tenant with ID ${id} not found`);
    }
    await this.tenantRepository.remove(tenant);
  }

  /**
   * Get tenant configuration
   */
  async getConfig(tenantId: string, key: string): Promise<any> {
    const config = await this.tenantConfigRepository.findOne({
      where: { tenantId, key },
    });

    return config ? config.value : null;
  }

  /**
   * Set tenant configuration
   */
  async setConfig(tenantId: string, key: string, value: string, metadata?: Record<string, any>): Promise<void> {
    let config = await this.tenantConfigRepository.findOne({
      where: { tenantId, key },
    });

    if (config) {
      config.value = value;
      if (metadata) config.metadata = metadata;
    } else {
      config = new TenantConfig();
      config.tenantId = tenantId;
      config.key = key;
      config.value = value;
      if (metadata) config.metadata = metadata;
    }

    await this.tenantConfigRepository.save(config);
  }

  /**
   * Get all configurations for a tenant
   */
  async getAllConfigs(tenantId: string): Promise<Record<string, any>> {
    const configs = await this.tenantConfigRepository.find({
      where: { tenantId },
    });

    const result: Record<string, any> = {};
    configs.forEach(config => {
      result[config.key] = config.value;
    });

    return result;
  }

  /**
   * Update tenant usage metrics
   */
  async recordUsage(tenantId: string, metric: string, value: number, metadata?: Record<string, any>): Promise<void> {
    const usage = new TenantUsage();
    usage.tenantId = tenantId;
    usage.metric = metric;
    usage.value = value;
    if (metadata) usage.metadata = metadata;

    await this.tenantUsageRepository.save(usage);
  }

  /**
   * Get tenant usage for a specific metric
   */
  async getUsage(tenantId: string, metric: string, startDate?: Date, endDate?: Date): Promise<number> {
    const queryBuilder = this.tenantUsageRepository.createQueryBuilder('usage')
      .where('usage.tenantId = :tenantId', { tenantId })
      .andWhere('usage.metric = :metric', { metric });

    if (startDate) {
      queryBuilder.andWhere('usage.createdAt >= :startDate', { startDate });
    }

    if (endDate) {
      queryBuilder.andWhere('usage.createdAt <= :endDate', { endDate });
    }

    const results = await queryBuilder.orderBy('usage.createdAt', 'DESC').getMany();
    return results.reduce((sum, record) => sum + Number(record.value), 0);
  }

  /**
   * Create tenant invitation
   */
  async createInvitation(tenantId: string, email: string, invitedBy: string, expiresAt?: Date): Promise<TenantInvitation> {
    // Check if invitation already exists
    const existingInvitation = await this.tenantInvitationRepository.findOne({
      where: { email, tenantId, status: 'pending' },
    });

    if (existingInvitation) {
      throw new ConflictException(`Invitation for ${email} already exists`);
    }

    const invitation = new TenantInvitation();
    invitation.email = email;
    invitation.tenantId = tenantId;
    invitation.invitedBy = invitedBy;
    invitation.expiresAt = expiresAt || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days default
    invitation.status = 'pending';

    return await this.tenantInvitationRepository.save(invitation);
  }

  /**
   * Accept invitation
   */
  async acceptInvitation(token: string, userId: string): Promise<TenantInvitation> {
    // In a real implementation, token would be stored and verified
    // For now, we'll simulate by accepting the first pending invitation for the user's email
    const invitation = await this.tenantInvitationRepository.findOne({
      where: { 
        // Using email as a proxy for token in this simplified version
        email: token,
        status: 'pending' 
      },
    });

    if (!invitation) {
      throw new NotFoundException(`Invitation not found`);
    }

    if (invitation.expiresAt && invitation.expiresAt < new Date()) {
      invitation.status = 'expired';
      await this.tenantInvitationRepository.save(invitation);
      throw new BadRequestException(`Invitation has expired`);
    }

    invitation.status = 'accepted';
    invitation.acceptedBy = userId;
    invitation.acceptedAt = new Date();

    return await this.tenantInvitationRepository.save(invitation);
  }
}
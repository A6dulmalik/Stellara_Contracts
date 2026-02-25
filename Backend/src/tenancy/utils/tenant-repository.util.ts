import { Repository, SelectQueryBuilder } from 'typeorm';
import { TenantIsolationService } from '../services/tenant-isolation.service';

/**
 * Creates a tenant-aware repository wrapper that automatically applies tenant filters
 */
export class TenantAwareRepository<T extends Object> {
  constructor(
    private readonly baseRepository: Repository<T>,
    private readonly tenantIsolationService: TenantIsolationService,
    private readonly entityName: string,
  ) {}

  /**
   * Get the base repository
   */
  getBaseRepository(): Repository<T> {
    return this.baseRepository;
  }

  /**
   * Create a query builder with tenant filter applied
   */
  createQueryBuilder(alias?: string): SelectQueryBuilder<T> {
    const qb = this.baseRepository.createQueryBuilder(alias || this.entityName.toLowerCase());
    return this.tenantIsolationService.addTenantFilter(qb);
  }

  /**
   * Find entities with tenant filter applied
   */
  async find(options?: any): Promise<T[]> {
    const queryBuilder = this.createQueryBuilder();
    
    if (options?.where) {
      queryBuilder.where(options.where);
    }
    
    if (options?.relations) {
      queryBuilder.leftJoinAndSelect(`${queryBuilder.alias}.tenant`, 'tenant');
    }
    
    if (options?.order) {
      Object.entries(options.order).forEach(([field, direction]) => {
        queryBuilder.addOrderBy(`${queryBuilder.alias}.${field}`, direction as 'ASC' | 'DESC');
      });
    }
    
    if (options?.skip) {
      queryBuilder.skip(options.skip);
    }
    
    if (options?.take) {
      queryBuilder.take(options.take);
    }
    
    return await queryBuilder.getMany();
  }

  /**
   * Find one entity with tenant filter applied
   */
  async findOne(options: any): Promise<T | null> {
    const queryBuilder = this.createQueryBuilder();
    
    if (options?.where) {
      queryBuilder.where(options.where);
    }
    
    if (options?.relations) {
      queryBuilder.leftJoinAndSelect(`${queryBuilder.alias}.tenant`, 'tenant');
    }
    
    return await queryBuilder.getOne();
  }

  /**
   * Count entities with tenant filter applied
   */
  async count(options?: any): Promise<number> {
    const queryBuilder = this.createQueryBuilder();
    
    if (options?.where) {
      queryBuilder.where(options.where);
    }
    
    return await queryBuilder.getCount();
  }

  /**
   * Save entity with tenant context validation
   */
  async save(entity: T | T[]): Promise<T | T[]> {
    // If saving multiple entities, validate each one
    if (Array.isArray(entity)) {
      // Validate that all entities belong to the current tenant
      for (const item of entity) {
        this.validateEntityTenant(item);
      }
      return await this.baseRepository.save(entity);
    } else {
      // Validate that single entity belongs to the current tenant
      this.validateEntityTenant(entity);
      return await this.baseRepository.save(entity);
    }
  }

  /**
   * Remove entity with tenant context validation
   */
  async remove(entity: T | T[]): Promise<T | T[]> {
    // Validate tenant access before removal
    if (Array.isArray(entity)) {
      for (const item of entity) {
        await this.validateEntityTenantAccess(item);
      }
      return await this.baseRepository.remove(entity);
    } else {
      await this.validateEntityTenantAccess(entity);
      return await this.baseRepository.remove(entity);
    }
  }

  /**
   * Soft delete entity with tenant context validation
   */
  async softDelete(criteria: any): Promise<any> {
    // Apply tenant filter to the criteria
    const tenantId = this.tenantIsolationService.getCurrentTenantId();
    if (!tenantId) {
      throw new Error('No tenant context available');
    }

    // Combine tenant filter with provided criteria
    const whereClause = {
      ...(typeof criteria === 'object' ? criteria : { id: criteria }),
      tenantId,
    };

    return await this.baseRepository.softDelete(whereClause);
  }

  /**
   * Validate that an entity belongs to the current tenant
   */
  private validateEntityTenant(entity: T): void {
    const tenantId = this.tenantIsolationService.getCurrentTenantId();
    if (!tenantId) {
      throw new Error('No tenant context available');
    }

    // For this validation to work properly, the entity needs to have a tenantId property
    // This assumes that the entity has a tenantId field that can be accessed
    const entityObj = entity as any;
    if (entityObj.tenantId && entityObj.tenantId !== tenantId) {
      throw new Error(`Entity does not belong to current tenant: ${tenantId}`);
    }

    // If the entity doesn't have a tenantId yet, assign it
    if (!entityObj.tenantId) {
      entityObj.tenantId = tenantId;
    }
  }

  /**
   * Validate that the current tenant has access to an entity
   */
  private async validateEntityTenantAccess(entity: T): Promise<void> {
    const tenantId = this.tenantIsolationService.getCurrentTenantId();
    if (!tenantId) {
      throw new Error('No tenant context available');
    }

    const entityObj = entity as any;
    if (entityObj.tenantId && entityObj.tenantId !== tenantId) {
      throw new Error(`Access denied: Entity does not belong to current tenant: ${tenantId}`);
    }

    // If the entity has an ID but no tenantId, verify access through the database
    if (entityObj.id && !entityObj.tenantId) {
      const exists = await this.findOne({ where: { id: entityObj.id } });
      if (!exists) {
        throw new Error(`Access denied: Entity not found in current tenant context`);
      }
    }
  }
}

/**
 * Helper function to create a tenant-aware repository
 */
export function createTenantAwareRepository<T extends Object>(
  baseRepository: Repository<T>,
  tenantIsolationService: TenantIsolationService,
  entityName: string,
): TenantAwareRepository<T> {
  return new TenantAwareRepository(baseRepository, tenantIsolationService, entityName);
}
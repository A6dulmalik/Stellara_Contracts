import { Injectable, Scope } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import type { Request } from 'express';
import { Tenant } from '../entities/tenant.entity';
import { User } from '../../auth/entities/user.entity';

/**
 * Service that ensures tenant data isolation by adding tenant filters to queries
 */
@Injectable({ scope: Scope.REQUEST }) // Request-scoped to access request context
export class TenantIsolationService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private readonly request: Request, // Inject request to access tenant context
  ) {}

  /**
   * Add tenant filter to a query builder
   */
  addTenantFilter<T extends Object>(queryBuilder: SelectQueryBuilder<T>): SelectQueryBuilder<T> {
    const tenantId = this.request.tenantId;
    
    if (!tenantId) {
      // If no tenant context, we might want to throw an error or handle differently
      // depending on your security requirements
      console.warn('No tenant context found in request');
      return queryBuilder;
    }

    // Assuming the entity has a tenantId column or relation
    return queryBuilder.andWhere('tenant_id = :tenantId', { tenantId });
  }

  /**
   * Get tenant-scoped repository for a given entity
   * This is a higher-order function that returns a filtered repository
   */
  getTenantScopedRepository<Entity extends Object>(repository: Repository<Entity>): Repository<Entity> {
    const tenantId = this.request.tenantId;
    
    if (!tenantId) {
      // Return original repository if no tenant context
      return repository;
    }

    // Return a proxy that adds tenant filtering to all find operations
    return new Proxy(repository, {
      get: (target: Repository<Entity>, prop: string) => {
        if (prop === 'find' || prop === 'findOne' || prop === 'count' || prop === 'findAndCount') {
          return async (...args: any[]) => {
            const queryBuilder = target.createQueryBuilder();
            
            // Add tenant filter
            queryBuilder.andWhere('tenant_id = :tenantId', { tenantId });
            
            // Apply any additional conditions from the original method
            if (args[0]?.where) {
              queryBuilder.andWhere(args[0].where);
            }
            
            // Execute based on the original method
            if (prop === 'find') {
              return queryBuilder.getMany();
            } else if (prop === 'findOne') {
              return queryBuilder.getOne();
            } else if (prop === 'count') {
              return queryBuilder.getCount();
            } else if (prop === 'findAndCount') {
              const items = await queryBuilder.getMany();
              const count = await queryBuilder.getCount();
              return [items, count] as [Entity[], number];
            }
          };
        }
        
        return target[prop];
      },
    });
  }

  /**
   * Verify that a user belongs to the current tenant
   */
  async verifyUserTenantAccess(userId: string): Promise<boolean> {
    const tenantId = this.request.tenantId;
    
    if (!tenantId) {
      return false;
    }

    const user = await this.userRepository.findOne({
      where: { id: userId, tenantId },
    });

    return !!user;
  }

  /**
   * Get the current tenant from request context
   */
  getCurrentTenant(): Tenant | null {
    return this.request.tenant || null;
  }

  /**
   * Get the current tenant ID from request context
   */
  getCurrentTenantId(): string | null {
    return this.request.tenantId || null;
  }

  /**
   * Check if current tenant has a specific feature enabled
   */
  hasFeature(feature: string): boolean {
    const tenant = this.getCurrentTenant();
    if (!tenant || !tenant.features) {
      return false;
    }
    
    return tenant.features[feature] === true;
  }

  /**
   * Check if current tenant has exceeded a limit
   */
  hasExceededLimit(limitName: string, currentValue: number): boolean {
    const tenant = this.getCurrentTenant();
    if (!tenant || !tenant.limits) {
      // If no limits defined, assume unlimited
      return false;
    }

    const maxLimit = tenant.limits[limitName];
    if (maxLimit === undefined) {
      // If limit not defined, assume unlimited
      return false;
    }

    return currentValue >= maxLimit;
  }
}
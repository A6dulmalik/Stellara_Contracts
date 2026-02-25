import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class TenantDatabaseService {
  private readonly logger = new Logger(TenantDatabaseService.name);

  constructor(private dataSource: DataSource) {}

  /**
   * Create a dedicated schema for a tenant
   */
  async createTenantSchema(tenantId: string): Promise<void> {
    const schemaName = `tenant_${tenantId.replace(/-/g, '_')}`;

    try {
      // Create the schema
      await this.dataSource.query(
        `CREATE SCHEMA IF NOT EXISTS "${schemaName}"`,
      );

      this.logger.log(`Created schema for tenant ${tenantId}: ${schemaName}`);
    } catch (error) {
      this.logger.error(
        `Failed to create schema for tenant ${tenantId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Drop a tenant's schema (use with caution!)
   */
  async dropTenantSchema(tenantId: string): Promise<void> {
    const schemaName = `tenant_${tenantId.replace(/-/g, '_')}`;

    try {
      // Drop the schema and all its contents
      await this.dataSource.query(
        `DROP SCHEMA IF EXISTS "${schemaName}" CASCADE`,
      );

      this.logger.log(`Dropped schema for tenant ${tenantId}: ${schemaName}`);
    } catch (error) {
      this.logger.error(`Failed to drop schema for tenant ${tenantId}:`, error);
      throw error;
    }
  }

  /**
   * Run migrations for a specific tenant's schema
   */
  async runTenantMigrations(tenantId: string): Promise<void> {
    const schemaName = `tenant_${tenantId.replace(/-/g, '_')}`;

    try {
      // Set the search path to the tenant's schema
      await this.dataSource.query(
        `SET search_path TO "${schemaName}", public;`,
      );

      // Here you would typically run tenant-specific migrations
      // For now, we'll just log that migrations would run
      this.logger.log(
        `Would run migrations for tenant ${tenantId} in schema: ${schemaName}`,
      );

      // Reset search path
      await this.dataSource.query(`SET search_path TO public;`);
    } catch (error) {
      this.logger.error(
        `Failed to run migrations for tenant ${tenantId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Get tenant-specific connection options
   */
  getTenantConnectionOptions(tenantId: string) {
    const schemaName = `tenant_${tenantId.replace(/-/g, '_')}`;

    return {
      schema: schemaName,
      searchPath: `"${schemaName}", public`,
    };
  }

  /**
   * Validate that a tenant's schema exists and is accessible
   */
  async validateTenantSchema(tenantId: string): Promise<boolean> {
    const schemaName = `tenant_${tenantId.replace(/-/g, '_')}`;

    try {
      // Check if schema exists
      const result = await this.dataSource.query(
        `
        SELECT schema_name 
        FROM information_schema.schemata 
        WHERE schema_name = $1
      `,
        [schemaName],
      );

      return result.length > 0;
    } catch (error) {
      this.logger.error(
        `Failed to validate schema for tenant ${tenantId}:`,
        error,
      );
      return false;
    }
  }

  /**
   * Prepare connection for tenant-specific operations
   */
  async prepareTenantConnection(tenantId: string): Promise<void> {
    const schemaName = `tenant_${tenantId.replace(/-/g, '_')}`;

    // Set the search path to prioritize the tenant's schema
    await this.dataSource.query(`SET search_path TO "${schemaName}", public;`);
  }
}

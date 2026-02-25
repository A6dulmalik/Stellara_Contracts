import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateTenantEntities1772033648911 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create tenants table
        await queryRunner.query(`
            CREATE TABLE "tenants" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "name" character varying NOT NULL,
                "subdomain" character varying NOT NULL,
                "customDomain" character varying,
                "description" text,
                "status" character varying CHECK ("status" IN ('active', 'inactive', 'suspended', 'trial')) DEFAULT 'trial',
                "isPremium" boolean DEFAULT false,
                "metadata" json DEFAULT '{}',
                "settings" json DEFAULT '{}',
                "features" json DEFAULT '{}',
                "limits" json DEFAULT '{}',
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_tenants_id" PRIMARY KEY ("id"),
                CONSTRAINT "UQ_tenants_name" UNIQUE ("name"),
                CONSTRAINT "UQ_tenants_subdomain" UNIQUE ("subdomain"),
                CONSTRAINT "UQ_tenants_custom_domain" UNIQUE ("customDomain")
            )
        `);

        // Create tenant_configs table
        await queryRunner.query(`
            CREATE TABLE "tenant_configs" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "key" character varying NOT NULL,
                "value" text NOT NULL,
                "metadata" json,
                "isActive" boolean DEFAULT true,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                "tenant_id" uuid,
                CONSTRAINT "PK_tenant_configs_id" PRIMARY KEY ("id"),
                CONSTRAINT "FK_tenant_config_tenant_id" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE
            )
        `);

        // Create tenant_usages table
        await queryRunner.query(`
            CREATE TABLE "tenant_usages" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "metric" character varying NOT NULL,
                "value" bigint NOT NULL,
                "metadata" json,
                "periodStart" TIMESTAMP WITH TIME ZONE,
                "periodEnd" TIMESTAMP WITH TIME ZONE,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                "tenant_id" uuid,
                CONSTRAINT "PK_tenant_usages_id" PRIMARY KEY ("id"),
                CONSTRAINT "FK_tenant_usage_tenant_id" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE
            )
        `);

        // Create tenant_invitations table
        await queryRunner.query(`
            CREATE TABLE "tenant_invitations" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "email" character varying NOT NULL,
                "status" character varying CHECK ("status" IN ('pending', 'accepted', 'expired', 'cancelled')) DEFAULT 'pending',
                "invitedBy" character varying,
                "acceptedBy" character varying,
                "expiresAt" TIMESTAMP WITH TIME ZONE,
                "acceptedAt" TIMESTAMP WITH TIME ZONE,
                "metadata" json,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                "tenant_id" uuid,
                CONSTRAINT "PK_tenant_invitations_id" PRIMARY KEY ("id"),
                CONSTRAINT "UQ_tenant_invitations_email" UNIQUE ("email"),
                CONSTRAINT "FK_tenant_invitation_tenant_id" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE
            )
        `);

        // Add tenant_id column to users table
        await queryRunner.query(`
            ALTER TABLE "users" ADD COLUMN "tenant_id" uuid,
            ADD CONSTRAINT "FK_users_tenant_id" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE
        `);

        // Create indexes for better performance
        await queryRunner.query(`CREATE INDEX "IDX_tenants_status" ON "tenants" ("status")`);
        await queryRunner.query(`CREATE INDEX "IDX_tenant_configs_key" ON "tenant_configs" ("key")`);
        await queryRunner.query(`CREATE INDEX "IDX_tenant_usages_metric" ON "tenant_usages" ("metric")`);
        await queryRunner.query(`CREATE INDEX "IDX_tenant_usages_tenant_id" ON "tenant_usages" ("tenant_id")`);
        await queryRunner.query(`CREATE INDEX "IDX_tenant_invitations_status" ON "tenant_invitations" ("status")`);
        await queryRunner.query(`CREATE INDEX "IDX_tenant_invitations_tenant_id" ON "tenant_invitations" ("tenant_id")`);
        await queryRunner.query(`CREATE INDEX "IDX_users_tenant_id" ON "users" ("tenant_id")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop indexes
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_users_tenant_id"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_tenant_invitations_tenant_id"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_tenant_invitations_status"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_tenant_usages_tenant_id"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_tenant_usages_metric"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_tenant_configs_key"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_tenants_status"`);

        // Remove tenant_id column from users table
        await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "FK_users_tenant_id"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "tenant_id"`);

        // Drop tenant_invitations table
        await queryRunner.query(`DROP TABLE "tenant_invitations"`);

        // Drop tenant_usages table
        await queryRunner.query(`DROP TABLE "tenant_usages"`);

        // Drop tenant_configs table
        await queryRunner.query(`DROP TABLE "tenant_configs"`);

        // Drop tenants table
        await queryRunner.query(`DROP TABLE "tenants"`);
    }

}
import {
  Injectable,
  NestMiddleware,
  UnauthorizedException,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { TenantService } from '../tenant.service';

declare global {
  namespace Express {
    interface Request {
      tenant?: any; // We'll define a proper type later
      tenantId?: string;
    }
  }
}

@Injectable()
export class TenantContextMiddleware implements NestMiddleware {
  constructor(private readonly tenantService: TenantService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    // Extract tenant identifier from various sources
    let tenantIdentifier: string | undefined;

    // 1. Try to get tenant from subdomain
    if (req.headers.host) {
      const host = req.headers.host;
      const subdomainMatch = host.match(/^([^.]+)\./);
      if (subdomainMatch && subdomainMatch[1]) {
        tenantIdentifier = subdomainMatch[1];
      }
    }

    // 2. Try to get tenant from header
    if (!tenantIdentifier && req.headers['x-tenant-id']) {
      tenantIdentifier = Array.isArray(req.headers['x-tenant-id'])
        ? req.headers['x-tenant-id'][0]
        : req.headers['x-tenant-id'];
    }

    // 3. Try to get tenant from query parameter (for testing purposes)
    if (!tenantIdentifier && req.query.tenantId) {
      tenantIdentifier =
        typeof req.query.tenantId === 'string' ? req.query.tenantId : undefined;
    }

    // 4. Try to get tenant from authorization header (if using tenant-specific tokens)
    if (!tenantIdentifier && req.headers.authorization) {
      // If using tenant-specific tokens, extract tenant info from token
      // This is a simplified version - in practice you'd decode JWT and extract tenant info
    }

    if (tenantIdentifier) {
      // Find tenant by subdomain, custom domain, or ID
      let tenant = await this.tenantService.findBySubdomain(tenantIdentifier);

      if (!tenant) {
        tenant = await this.tenantService.findByCustomDomain(tenantIdentifier);
      }

      if (!tenant) {
        // If no tenant found, you might want to allow it to proceed with a default tenant
        // or throw an error depending on your requirements
        // For now, we'll allow requests without a tenant but log it
        console.warn(`Tenant not found for identifier: ${tenantIdentifier}`);
      } else {
        // Set tenant context
        req.tenant = tenant;
        req.tenantId = tenant.id;
      }
    }

    // If no tenant identifier is found, continue without tenant context
    // This allows for public endpoints or default tenant behavior

    next();
  }
}

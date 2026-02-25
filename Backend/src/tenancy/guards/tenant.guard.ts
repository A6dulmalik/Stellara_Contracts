import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Observable } from 'rxjs';

@Injectable()
export class TenantGuard implements CanActivate {
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest();

    // Check if tenant context exists
    if (!request.tenantId) {
      // Optionally throw an error or redirect to tenant selection
      // For now, we'll just return false to deny access
      console.warn('Request lacks tenant context');
      return false;
    }

    // You can add additional tenant-specific checks here
    // For example: checking tenant status, limits, etc.
    const tenant = request.tenant;
    if (tenant && tenant.status !== 'active') {
      console.warn(`Tenant ${tenant.id} is not active: ${tenant.status}`);
      return false;
    }

    return true;
  }
}

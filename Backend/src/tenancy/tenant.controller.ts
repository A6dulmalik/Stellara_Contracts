// Define TenantInvitation type for the controller
export class TenantInvitation {
  id: string;
  email: string;
  status: string;
  invitedBy?: string;
  acceptedBy?: string;
  expiresAt?: Date;
  acceptedAt?: Date;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  tenantId: string;
}

import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { TenantService } from './tenant.service';
import { Tenant } from './entities/tenant.entity';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';

@ApiTags('tenants')
@Controller('tenants')
export class TenantController {
  constructor(private readonly tenantService: TenantService) {}

  @ApiOperation({ summary: 'Create a new tenant' })
  @ApiResponse({
    status: 201,
    description: 'Tenant created successfully',
    type: Tenant,
  })
  @ApiResponse({
    status: 409,
    description: 'Tenant with subdomain already exists',
  })
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body()
    createTenantDto: {
      name: string;
      subdomain: string;
      customDomain?: string;
      description?: string;
    },
  ): Promise<Tenant> {
    return await this.tenantService.createTenant(createTenantDto);
  }

  @ApiOperation({ summary: 'Get all tenants' })
  @ApiResponse({ status: 200, description: 'List of tenants', type: [Tenant] })
  @Get()
  async findAll(): Promise<Tenant[]> {
    return await this.tenantService.findAll();
  }

  @ApiOperation({ summary: 'Get tenant by ID' })
  @ApiResponse({ status: 200, description: 'Tenant found', type: Tenant })
  @ApiResponse({ status: 404, description: 'Tenant not found' })
  @ApiParam({ name: 'id', description: 'Tenant ID' })
  @Get(':id')
  async findOne(@Param('id') id: string): Promise<Tenant> {
    const tenant = await this.tenantService.findById(id);
    if (!tenant) {
      throw new Error(`Tenant with ID ${id} not found`); // Will be handled by exception filter
    }
    return tenant;
  }

  @ApiOperation({ summary: 'Update tenant' })
  @ApiResponse({
    status: 200,
    description: 'Tenant updated successfully',
    type: Tenant,
  })
  @ApiResponse({ status: 404, description: 'Tenant not found' })
  @ApiParam({ name: 'id', description: 'Tenant ID' })
  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updateTenantDto: Partial<Tenant>,
  ): Promise<Tenant> {
    return await this.tenantService.update(id, updateTenantDto);
  }

  @ApiOperation({ summary: 'Delete tenant' })
  @ApiResponse({ status: 200, description: 'Tenant deleted successfully' })
  @ApiResponse({ status: 404, description: 'Tenant not found' })
  @ApiParam({ name: 'id', description: 'Tenant ID' })
  @Delete(':id')
  async remove(@Param('id') id: string): Promise<void> {
    await this.tenantService.delete(id);
  }

  @ApiOperation({ summary: 'Activate tenant' })
  @ApiResponse({
    status: 200,
    description: 'Tenant activated successfully',
    type: Tenant,
  })
  @ApiResponse({ status: 404, description: 'Tenant not found' })
  @ApiParam({ name: 'id', description: 'Tenant ID' })
  @Post(':id/activate')
  async activate(@Param('id') id: string): Promise<Tenant> {
    return await this.tenantService.activate(id);
  }

  @ApiOperation({ summary: 'Deactivate tenant' })
  @ApiResponse({
    status: 200,
    description: 'Tenant deactivated successfully',
    type: Tenant,
  })
  @ApiResponse({ status: 404, description: 'Tenant not found' })
  @ApiParam({ name: 'id', description: 'Tenant ID' })
  @Post(':id/deactivate')
  async deactivate(@Param('id') id: string): Promise<Tenant> {
    return await this.tenantService.deactivate(id);
  }

  @ApiOperation({ summary: 'Get tenant configuration' })
  @ApiResponse({ status: 200, description: 'Configuration value' })
  @ApiResponse({ status: 404, description: 'Configuration not found' })
  @ApiParam({ name: 'tenantId', description: 'Tenant ID' })
  @ApiParam({ name: 'key', description: 'Configuration key' })
  @Get(':tenantId/config/:key')
  async getConfig(
    @Param('tenantId') tenantId: string,
    @Param('key') key: string,
  ): Promise<any> {
    return await this.tenantService.getConfig(tenantId, key);
  }

  @ApiOperation({ summary: 'Set tenant configuration' })
  @ApiResponse({ status: 200, description: 'Configuration set successfully' })
  @ApiParam({ name: 'tenantId', description: 'Tenant ID' })
  @ApiParam({ name: 'key', description: 'Configuration key' })
  @ApiBody({
    schema: { type: 'object', properties: { value: { type: 'string' } } },
  })
  @Post(':tenantId/config/:key')
  async setConfig(
    @Param('tenantId') tenantId: string,
    @Param('key') key: string,
    @Body() body: { value: string },
  ): Promise<void> {
    await this.tenantService.setConfig(tenantId, key, body.value);
  }

  @ApiOperation({ summary: 'Get all tenant configurations' })
  @ApiResponse({ status: 200, description: 'All configurations for tenant' })
  @ApiParam({ name: 'tenantId', description: 'Tenant ID' })
  @Get(':tenantId/config')
  async getAllConfigs(
    @Param('tenantId') tenantId: string,
  ): Promise<Record<string, any>> {
    return await this.tenantService.getAllConfigs(tenantId);
  }

  @ApiOperation({ summary: 'Get tenant usage' })
  @ApiResponse({ status: 200, description: 'Usage data for tenant' })
  @ApiParam({ name: 'tenantId', description: 'Tenant ID' })
  @ApiParam({ name: 'metric', description: 'Usage metric' })
  @Get(':tenantId/usage/:metric')
  async getUsage(
    @Param('tenantId') tenantId: string,
    @Param('metric') metric: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<number> {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;
    return await this.tenantService.getUsage(tenantId, metric, start, end);
  }

  @ApiOperation({ summary: 'Create tenant invitation' })
  @ApiResponse({
    status: 201,
    description: 'Invitation created successfully',
    type: TenantInvitation,
  })
  @ApiParam({ name: 'tenantId', description: 'Tenant ID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: { email: { type: 'string' }, invitedBy: { type: 'string' } },
    },
  })
  @Post(':tenantId/invitations')
  async createInvitation(
    @Param('tenantId') tenantId: string,
    @Body() body: { email: string; invitedBy: string; expiresAt?: string },
  ): Promise<TenantInvitation> {
    const expiresAt = body.expiresAt ? new Date(body.expiresAt) : undefined;
    return await this.tenantService.createInvitation(
      tenantId,
      body.email,
      body.invitedBy,
      expiresAt,
    );
  }
}

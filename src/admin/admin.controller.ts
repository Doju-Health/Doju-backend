import {
  BadRequestException,
  Controller,
  DefaultValuePipe,
  Delete,
  Body,
  Get,
  Param,
  ParseBoolPipe,
  ParseIntPipe,
  Post,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiExcludeEndpoint,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth-guard';
import { RolesGuard } from 'src/common/guards/role.guards';
import { SuperAdminGuard } from 'src/common/guards/super-admin.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { UserRole } from 'src/users/enums/user.enum';
import { PaginatedUsersResponseDto } from './dto/paginated-users-response.dto';
import { AdminUserResponseDto } from './dto/admin-user-response.dto';
import { OrderStatus, PaymentStatus } from 'src/orders/enums/order.enum';
import { CreateAdminAccountDto } from './dto/create-admin-account.dto';
import { InviteAdminDto } from './dto/invite-admin.dto';
import { CompleteAdminRegistrationDto } from './dto/complete-admin-registration.dto';
import { RejectSellerDto } from './dto/reject-seller.dto';
import { RejectProductDto } from './dto/reject-product.dto';

@ApiTags('Admin')
@ApiBearerAuth()
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Post('accounts')
  @ApiExcludeEndpoint()
  @ApiOperation({ summary: 'Create the super admin account' })
  @ApiBody({ type: CreateAdminAccountDto })
  @ApiCreatedResponse({
    description: 'Super admin account created successfully',
    schema: {
      example: {
        message: 'Super admin account created successfully',
        user: {
          id: '123e4567-e89b-12d3-a456-426614174000',
          fullName: 'Ada Admin',
          email: 'ada.admin@dojuhealth.com',
          role: 'super_admin',
          isSuperAdmin: true,
          emailVerified: true,
          isActive: true,
        },
      },
    },
  })
  @ApiBadRequestResponse({ description: 'Email already registered' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid JWT token' })
  @ApiForbiddenResponse({ description: 'User does not have admin role' })
  createAdminAccount(@Body() dto: CreateAdminAccountDto) {
    return this.adminService.createAdminAccount(dto);
  }

  @Post('invite')
  @ApiExcludeEndpoint()
  @UseGuards(JwtAuthGuard, RolesGuard, SuperAdminGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Invite an admin by email (super admin only)' })
  @ApiBody({ type: InviteAdminDto })
  @ApiCreatedResponse({
    description: 'Admin invitation sent successfully',
    schema: {
      example: {
        message: 'Admin invitation sent successfully',
        email: 'new.admin@website.com',
        completeUrl:
          'https://www.website/complete/new.admin',
      },
    },
  })
  @ApiBadRequestResponse({ description: 'Email cannot be invited' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid JWT token' })
  @ApiForbiddenResponse({ description: 'User does not have admin role' })
  inviteAdmin(
    @CurrentUser() currentUser: { id: string; isSuperAdmin?: boolean },
    @Body() dto: InviteAdminDto,
  ) {
    return this.adminService.inviteAdmin(dto, currentUser);
  }

  @Delete('admins/:id')
  @ApiExcludeEndpoint()
  @UseGuards(JwtAuthGuard, RolesGuard, SuperAdminGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Remove an admin account (super admin only)' })
  @ApiParam({
    name: 'id',
    description: 'Admin unique identifier (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiQuery({
    name: 'hard',
    required: false,
    description: 'Hard delete admin when true (default: false)',
  })
  @ApiOkResponse({ description: 'Admin deleted/deactivated successfully' })
  @ApiBadRequestResponse({ description: 'Invalid request' })
  @ApiNotFoundResponse({ description: 'Admin not found' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid JWT token' })
  @ApiForbiddenResponse({ description: 'User does not have admin role' })
  removeAdmin(
    @CurrentUser() currentUser: { id: string; isSuperAdmin?: boolean },
    @Param('id') id: string,
    @Query('hard', new DefaultValuePipe(false), ParseBoolPipe) hard: boolean,
  ) {
    return this.adminService.removeAdmin(id, hard, currentUser);
  }

  @Post('complete-registration')
  @ApiExcludeEndpoint()
  @ApiOperation({ summary: 'Complete admin registration after invitation' })
  @ApiBody({ type: CompleteAdminRegistrationDto })
  @ApiOkResponse({
    description: 'Admin registration completed successfully',
    schema: {
      example: {
        message: 'Admin registration completed successfully',
        email: 'new.admin@dojuhealth.com',
      },
    },
  })
  @ApiBadRequestResponse({ description: 'Invalid registration data' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid JWT token' })
  @ApiForbiddenResponse({ description: 'User does not have admin role' })
  completeAdminRegistration(@Body() dto: CompleteAdminRegistrationDto) {
    return this.adminService.completeAdminRegistration(dto);
  }



  @Get('users')
  // @ApiExcludeEndpoint()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Get all users (paginated)',
    description:
      'Retrieve users with pagination and optional filters by role, active status, and search.',
  })
  @ApiQuery({ name: 'page', required: false, description: 'Page number (min 1)' })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Items per page (min 1, max 100)',
  })
  @ApiQuery({
    name: 'role',
    required: false,
    enum: UserRole,
    description: 'Filter by user role',
  })
  @ApiQuery({
    name: 'isActive',
    required: false,
    description: 'Filter by active status (true/false)',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Search by name or email',
  })
  @ApiQuery({
    name: 'companyName',
    required: false,
    description: 'Filter by company name',
  })
  @ApiQuery({
    name: 'createdAt',
    required: false,
    description: 'Filter by account creation date (ISO date or date-time)',
  })
  @ApiQuery({
    name: 'isVerified',
    required: false,
    enum: ['verified', 'pending', 'unverified', 'rejected', 'true', 'false'],
    description: 'Filter by verification status',
  })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    description: 'Sort by createdAt, fullName, or email',
  })
  @ApiOkResponse({ type: PaginatedUsersResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid JWT token' })
  @ApiForbiddenResponse({ description: 'User does not have admin role' })
  getUsers(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('role') role?: UserRole,
    @Query('isActive') isActive?: string,
    @Query('search') search?: string,
    @Query('companyName') companyName?: string,
    @Query('createdAt') createdAt?: string,
    @Query('isVerified') isVerified?: string,
    @Query('sortBy') sortBy?: 'createdAt' | 'fullName' | 'email',
  ) {
    if (role && !Object.values(UserRole).includes(role)) {
      throw new BadRequestException('Invalid role value');
    }

    if (sortBy && !['createdAt', 'fullName', 'email'].includes(sortBy)) {
      throw new BadRequestException('Invalid sortBy value');
    }

    const isActiveParsed =
      isActive !== undefined ? isActive === 'true' : undefined;

    return this.adminService.getUsers({
      page,
      limit,
      role,
      isActive: isActiveParsed,
      search,
      companyName,
      createdAt,
      isVerified,
      sortBy,
    });
  }

  @Get('users/:id')
  // @ApiExcludeEndpoint()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiParam({
    name: 'id',
    description: 'User unique identifier (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiOkResponse({ type: AdminUserResponseDto })
  @ApiNotFoundResponse({ description: 'User not found' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid JWT token' })
  @ApiForbiddenResponse({ description: 'User does not have admin role' })
  @ApiQuery({
    name: 'companyName',
    required: false,
    description: 'Optionally require a matching company name',
  })
  @ApiQuery({
    name: 'createdAt',
    required: false,
    description: 'Optionally require a matching account creation date',
  })
  @ApiQuery({
    name: 'isVerified',
    required: false,
    enum: ['verified', 'pending', 'unverified', 'rejected', 'true', 'false'],
    description: 'Optionally require a matching verification status',
  })
  getUserById(
    @Param('id') id: string,
    @Query('companyName') companyName?: string,
    @Query('createdAt') createdAt?: string,
    @Query('isVerified') isVerified?: string,
  ) {
    return this.adminService.getUserById(id, {
      companyName,
      createdAt,
      isVerified,
    });
  }

  @Delete('users/:id')
  @ApiExcludeEndpoint()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete user (soft or hard)' })
  @ApiParam({
    name: 'id',
    description: 'User unique identifier (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiQuery({
    name: 'hard',
    required: false,
    description: 'Hard delete user when true (default: false)',
  })
  @ApiOkResponse({ description: 'User deleted/deactivated successfully' })
  @ApiBadRequestResponse({ description: 'Invalid request' })
  @ApiNotFoundResponse({ description: 'User not found' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid JWT token' })
  @ApiForbiddenResponse({ description: 'User does not have admin role' })
  deleteUser(
    @CurrentUser() currentUser: { id: string; isSuperAdmin?: boolean },
    @Param('id') id: string,
    @Query('hard', new DefaultValuePipe(false), ParseBoolPipe) hard: boolean,
  ) {
    return this.adminService.deleteUser(id, hard, currentUser);
  }

  @Patch('users/:id/deactivate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Deactivate user account' })
  @ApiParam({
    name: 'id',
    description: 'User unique identifier (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiOkResponse({ description: 'User deactivated successfully' })
  @ApiNotFoundResponse({ description: 'User not found' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid JWT token' })
  @ApiForbiddenResponse({ description: 'User does not have admin role' })
  deactivateUser(
    @CurrentUser() currentUser: { id: string; isSuperAdmin?: boolean },
    @Param('id') id: string,
  ) {
    return this.adminService.deactivateUser(id, currentUser);
  }

  @Delete('products/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Remove product (soft or hard)' })
  @ApiParam({
    name: 'id',
    description: 'Product unique identifier (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiQuery({
    name: 'hard',
    required: false,
    description: 'Hard delete product when true (default: false)',
  })
  @ApiOkResponse({ description: 'Product deleted/deactivated successfully' })
  @ApiBadRequestResponse({ description: 'Invalid request' })
  @ApiNotFoundResponse({ description: 'Product not found' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid JWT token' })
  @ApiForbiddenResponse({ description: 'User does not have admin role' })
  removeProduct(
    @Param('id') id: string,
    @Query('hard', new DefaultValuePipe(false), ParseBoolPipe) hard: boolean,
  ) {
    return this.adminService.removeProduct(id, hard);
  }

  @Patch('sellers/:id/verify')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Verify seller (admin only)' })
  @ApiParam({
    name: 'id',
    description: 'Seller unique identifier (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiOkResponse({ description: 'Seller verified successfully' })
  @ApiNotFoundResponse({ description: 'User not found' })
  @ApiBadRequestResponse({ description: 'User is not a seller' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid JWT token' })
  @ApiForbiddenResponse({ description: 'User does not have admin role' })
  verifySeller(@Param('id') id: string) {
    return this.adminService.verifySeller(id);
  }

  @Patch('sellers/:id/reject')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Reject seller KYC (admin only)' })
  @ApiParam({
    name: 'id',
    description: 'Seller unique identifier (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiBody({ type: RejectSellerDto })
  @ApiOkResponse({ description: 'Seller rejected successfully' })
  @ApiNotFoundResponse({ description: 'User not found' })
  @ApiBadRequestResponse({ description: 'User is not a seller or reason is invalid' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid JWT token' })
  @ApiForbiddenResponse({ description: 'User does not have admin role' })
  rejectSeller(@Param('id') id: string, @Body() dto: RejectSellerDto) {
    return this.adminService.rejectSeller(id, dto.reason);
  }

//   @Patch('sellers/:id/kyc-approve')
//   @UseGuards(JwtAuthGuard, RolesGuard)
//  @Roles(UserRole.ADMIN)
//   @ApiOperation({ summary: 'Approve seller KYC (admin only)' })
//   @ApiParam({
//     name: 'id',
//     description: 'Seller unique identifier (UUID)',
//     example: '123e4567-e89b-12d3-a456-426614174000',
//   })
//   @ApiOkResponse({ description: 'KYC approved successfully' })
//   @ApiNotFoundResponse({ description: 'User not found' })
//   @ApiBadRequestResponse({ description: 'User is not a seller' })
//   @ApiUnauthorizedResponse({ description: 'Missing or invalid JWT token' })
//   @ApiForbiddenResponse({ description: 'User does not have admin role' })
//   approveSellerKyc(@Param('id') id: string) {
//     return this.adminService.approveSellerKyc(id);
//   }

  @Patch('products/:id/approve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Approve product (admin only)' })
  @ApiParam({
    name: 'id',
    description: 'Product unique identifier (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiOkResponse({ description: 'Product approved successfully' })
  @ApiNotFoundResponse({ description: 'Product not found' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid JWT token' })
  @ApiForbiddenResponse({ description: 'User does not have admin role' })
  approveProduct(@Param('id') id: string) {
    return this.adminService.approveProduct(id);
  }

  @Patch('products/:id/reject')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Reject product (admin only)' })
  @ApiParam({
    name: 'id',
    description: 'Product unique identifier (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiBody({ type: RejectProductDto })
  @ApiOkResponse({ description: 'Product rejected successfully' })
  @ApiNotFoundResponse({ description: 'Product not found' })
  @ApiBadRequestResponse({
    description: 'Product rejection reason is invalid or missing',
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid JWT token' })
  @ApiForbiddenResponse({ description: 'User does not have admin role' })
  rejectProduct(@Param('id') id: string, @Body() dto: RejectProductDto) {
    return this.adminService.rejectProduct(id, dto.reason);
  }

  @Get('sellers/:id/products')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get products for a seller (admin only)' })
  @ApiParam({
    name: 'id',
    description: 'Seller unique identifier (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiOkResponse({ description: 'Seller products retrieved successfully' })
  @ApiNotFoundResponse({ description: 'User not found' })
  @ApiBadRequestResponse({ description: 'User is not a seller' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid JWT token' })
  @ApiForbiddenResponse({ description: 'User does not have admin role' })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Page number (min 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Items per page (min 1, max 100)',
  })
  @ApiQuery({
    name: 'isVerified',
    required: false,
    description: 'Filter by seller verification status (true/false/unverified/pending/verified)',
  })
  @ApiQuery({
    name: 'categoryId',
    required: false,
    description: 'Filter by category UUID',
  })
  @ApiQuery({
    name: 'isApproved',
    required: false,
    description: 'Filter by product approval status (true/false)',
  })
  getSellerProducts(
    @Param('id') id: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('isVerified') isVerified?: string,
    @Query('categoryId') categoryId?: string,
    @Query('isApproved') isApproved?: string,
  ) {
    const isVerifiedParsed =
      isVerified !== undefined
        ? isVerified === 'true'
          ? true
          : isVerified === 'false'
            ? false
            : isVerified
        : undefined;
    const isApprovedParsed =
      isApproved !== undefined ? isApproved === 'true' : undefined;

    return this.adminService.getSellerProducts({
      sellerId: id,
      page,
      limit,
      isVerified: isVerifiedParsed,
      categoryId,
      isApproved: isApprovedParsed,
    });
  }

  @Get('buyers/:id/orders')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get orders for a buyer (admin only)' })
  @ApiParam({
    name: 'id',
    description: 'Buyer unique identifier (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiOkResponse({ description: 'Buyer orders retrieved successfully' })
  @ApiNotFoundResponse({ description: 'User not found' })
  @ApiBadRequestResponse({ description: 'User is not a buyer' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid JWT token' })
  @ApiForbiddenResponse({ description: 'User does not have admin role' })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Page number (min 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Items per page (min 1, max 100)',
  })
  @ApiQuery({
    name: 'orderStatus',
    required: false,
    enum: OrderStatus,
    description: 'Filter by order status',
  })
  @ApiQuery({
    name: 'paymentStatus',
    required: false,
    enum: PaymentStatus,
    description: 'Filter by payment status',
  })
  getBuyerOrders(
    @Param('id') id: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('orderStatus') orderStatus?: OrderStatus,
    @Query('paymentStatus') paymentStatus?: PaymentStatus,
  ) {
    if (
      orderStatus &&
      !Object.values(OrderStatus).includes(orderStatus)
    ) {
      throw new BadRequestException('Invalid orderStatus value');
    }

    if (
      paymentStatus &&
      !Object.values(PaymentStatus).includes(paymentStatus)
    ) {
      throw new BadRequestException('Invalid paymentStatus value');
    }

    return this.adminService.getBuyerOrders({
      buyerId: id,
      page,
      limit,
      orderStatus,
      paymentStatus,
    });
  }

  @Get('dashboard/stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get admin dashboard statistics' })
  @ApiOkResponse({ description: 'Dashboard statistics retrieved successfully' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid JWT token' })
  @ApiForbiddenResponse({ description: 'User does not have admin role' })
  getDashboardStats() {
    return this.adminService.getDashboardStats();
  }

  @Get('revenue')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get total revenue' })
  @ApiQuery({
    name: 'sellerId',
    required: false,
    description: 'Get revenue for a specific seller (UUID)',
  })
  @ApiOkResponse({
    description: 'Revenue calculated successfully',
    schema: {
      example: {
        total: 15499.95,
        currency: 'USD',
      },
    },
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid JWT token' })
  @ApiForbiddenResponse({ description: 'User does not have admin role' })
  async getRevenue(@Query('sellerId') sellerId?: string) {
    const total = await this.adminService.getRevenue(sellerId);
    return {
      total,
      currency: 'USD',
    };
  }
}

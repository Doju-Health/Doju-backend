import {
  BadRequestException,
  Controller,
  DefaultValuePipe,
  Delete,
  Get,
  Param,
  ParseBoolPipe,
  ParseIntPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
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
import { Roles } from 'src/common/decorators/roles.decorator';
import { UserRole } from 'src/users/enums/user.enum';
import { PaginatedUsersResponseDto } from './dto/paginated-users-response.dto';
import { AdminUserResponseDto } from './dto/admin-user-response.dto';
import { OrderStatus, PaymentStatus } from 'src/orders/enums/order.enum';

@ApiTags('Admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('users')
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
      sortBy,
    });
  }

  @Get('users/:id')
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
  getUserById(@Param('id') id: string) {
    return this.adminService.getUserById(id);
  }

  @Delete('users/:id')
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
    @Param('id') id: string,
    @Query('hard', new DefaultValuePipe(false), ParseBoolPipe) hard: boolean,
  ) {
    return this.adminService.deleteUser(id, hard);
  }

  @Patch('users/:id/deactivate')
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
  deactivateUser(@Param('id') id: string) {
    return this.adminService.deactivateUser(id);
  }

  @Delete('products/:id')
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

  @Patch('sellers/:id/kyc-approve')
  @ApiOperation({ summary: 'Approve seller KYC (admin only)' })
  @ApiParam({
    name: 'id',
    description: 'Seller unique identifier (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiOkResponse({ description: 'KYC approved successfully' })
  @ApiNotFoundResponse({ description: 'User not found' })
  @ApiBadRequestResponse({ description: 'User is not a seller' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid JWT token' })
  @ApiForbiddenResponse({ description: 'User does not have admin role' })
  approveSellerKyc(@Param('id') id: string) {
    return this.adminService.approveSellerKyc(id);
  }

  @Patch('products/:id/approve')
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

  @Get('sellers/:id/products')
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
    description: 'Filter by seller verification status (true/false)',
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
      isVerified !== undefined ? isVerified === 'true' : undefined;
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
  @ApiOperation({ summary: 'Get admin dashboard statistics' })
  @ApiOkResponse({ description: 'Dashboard statistics retrieved successfully' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid JWT token' })
  @ApiForbiddenResponse({ description: 'User does not have admin role' })
  getDashboardStats() {
    return this.adminService.getDashboardStats();
  }

  @Get('revenue')
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

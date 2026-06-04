import { Body, Controller, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { CompleteAdminRegistrationDto } from './dto/complete-admin-registration.dto';

@ApiTags('Admin')
@Controller('admin')
export class AdminRegistrationController {
  constructor(private readonly adminService: AdminService) {}

  @Post('complete-registration')
  @ApiOperation({ summary: 'Complete invited admin registration' })
  @ApiBody({ type: CompleteAdminRegistrationDto })
  @ApiCreatedResponse({
    description: 'Admin registration completed successfully',
    schema: {
      example: {
        message: 'Admin registration completed successfully',
        email: 'new.admin@dojuhealth.com',
      },
    },
  })
  @ApiBadRequestResponse({ description: 'Registration already completed' })
  @ApiNotFoundResponse({ description: 'Invited admin not found' })
  completeAdminRegistration(@Body() dto: CompleteAdminRegistrationDto) {
    return this.adminService.completeAdminRegistration(dto);
  }
}

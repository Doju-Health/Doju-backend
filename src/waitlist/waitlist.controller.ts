import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiBadRequestResponse, ApiBody, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JoinWaitlistDto } from './dto/join-waitlist.dto';
import { WaitlistService } from './waitlist.service';

@ApiTags('Waitlist')
@Controller('waitlist')
export class WaitlistController {
  constructor(private readonly waitlistService: WaitlistService) {}

  @Get()
  // @ApiExcludeEndpoint()
  @ApiOperation({ summary: 'Get all waitlist entries' })
  @ApiOkResponse({
    description: 'List of waitlist entries',
    schema: {
      example: [
        {
          id: '7adf3d5a-1c3a-4a11-8d10-9f2c4d4d2b3f',
          email: 'john@example.com',
          createdAt: '2026-04-05T12:00:00Z',
        },
      ],
    },
  })
  async getAllWaitlist() {
    return this.waitlistService.getAllWaitlist();
  }

  @Post()
  @ApiOperation({ summary: 'Join the waitlist' })
  @ApiBody({
    type: JoinWaitlistDto,
    examples: {
      example1: {
        summary: 'Join waitlist',
        value: {
          email: 'john@example.com',
        },
      },
    },
  })
  @ApiCreatedResponse({
    description: 'Added to waitlist',
    schema: {
      example: {
        message: 'You have been added to the waitlist',
        email: 'john@example.com',
        joinedAt: '2026-04-05T12:00:00Z',
      },
    },
  })
  @ApiBadRequestResponse({ description: 'Email already on waitlist' })
  async joinWaitlist(@Body() dto: JoinWaitlistDto) {
    return this.waitlistService.joinWaitlist(dto.email);
  }
}

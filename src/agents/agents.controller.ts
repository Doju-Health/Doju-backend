import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiCreatedResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Express } from 'express';
import { AgentsService } from './agents.service';
import { CreateAgentDto } from './dto/create-agent.dto';
import { UpdateAgentDto } from './dto/update-agent.dto';

@Controller('agents')
@ApiTags('Agents')
export class AgentsController {
  constructor(private readonly agentsService: AgentsService) {}

  @Post()
  @UseInterceptors(
    FileInterceptor('document', { limits: { fileSize: 10 * 1024 * 1024 } }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Submit an agent application with identity document' })
  @ApiBody({
    schema: {
      type: 'object',
      required: [
        'fullName', 'email', 'phone', 'state', 'coverageAreas', 'occupation',
        'socialMediaHandles', 'promotionPlan', 'promotionNotes', 'nin',
        'motivation', 'document',
      ],
      properties: {
        fullName: { type: 'string' },
        email: { type: 'string', format: 'email' },
        phone: { type: 'string' },
        state: { type: 'string' },
        coverageAreas: { type: 'string' },
        occupation: { type: 'string' },
        socialMediaHandles: { type: 'string', description: 'JSON object, e.g. {"instagram":"@name"}' },
        promotionPlan: { type: 'string' },
        promotionNotes: { type: 'string' },
        nin: { type: 'string' },
        motivation: { type: 'string' },
        document: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiCreatedResponse({ description: 'Agent application and private identity document created' })
  create(
    @Body() createAgentDto: CreateAgentDto,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }),
          new FileTypeValidator({
            fileType: /(image\/(jpeg|png)|application\/pdf)$/,
            fallbackToMimetype: true,
          }),
        ],
      }),
    )
    document: Express.Multer.File,
  ) {
    return this.agentsService.create(createAgentDto, document);
  }

  @Get()
  findAll() {
    return this.agentsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.agentsService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateAgentDto: UpdateAgentDto) {
    return this.agentsService.update(+id, updateAgentDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.agentsService.remove(+id);
  }
}

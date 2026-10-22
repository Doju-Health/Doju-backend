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
import { AmbassadorsService } from './ambassadors.service';
import { CreateAmbassadorDto } from './dto/create-ambassador.dto';
import { UpdateAmbassadorDto } from './dto/update-ambassador.dto';

@Controller('ambassadors')
@ApiTags('Ambassadors')
export class AmbassadorsController {
  constructor(private readonly ambassadorsService: AmbassadorsService) {}

  @Post()
  @UseInterceptors(
    FileInterceptor('document', { limits: { fileSize: 10 * 1024 * 1024 } }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Submit a student ambassador application with ID document' })
  @ApiBody({
    schema: {
      type: 'object',
      required: [
        'fullName', 'email', 'phone', 'state', 'institution', 'courseDepartment',
        'level', 'socialMediaHandles', 'promotionPlan', 'promotionNotes',
        'studentMatricNo', 'document',
      ],
      properties: {
        fullName: { type: 'string' },
        email: { type: 'string', format: 'email' },
        phone: { type: 'string' },
        state: { type: 'string' },
        institution: { type: 'string' },
        courseDepartment: { type: 'string' },
        level: { type: 'string' },
        socialMediaHandles: { type: 'string', description: 'JSON object, e.g. {"instagram":"@name"}' },
        promotionPlan: { type: 'string' },
        promotionNotes: { type: 'string' },
        studentMatricNo: { type: 'string' },
        document: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiCreatedResponse({ description: 'Ambassador application and private ID document created' })
  create(
    @Body() createAmbassadorDto: CreateAmbassadorDto,
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
    return this.ambassadorsService.create(createAmbassadorDto, document);
  }

  @Get()
  findAll() {
    return this.ambassadorsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.ambassadorsService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateAmbassadorDto: UpdateAmbassadorDto) {
    return this.ambassadorsService.update(id, updateAmbassadorDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.ambassadorsService.remove(id);
  }
}

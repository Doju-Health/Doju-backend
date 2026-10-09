import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AmbassadorsService } from './ambassadors.service';
import { CreateAmbassadorDto } from './dto/create-ambassador.dto';
import { UpdateAmbassadorDto } from './dto/update-ambassador.dto';

@Controller('ambassadors')
@ApiTags('Ambassadors')
export class AmbassadorsController {
  constructor(private readonly ambassadorsService: AmbassadorsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a student ambassador account' })
  create(@Body() createAmbassadorDto: CreateAmbassadorDto) {
    return this.ambassadorsService.create(createAmbassadorDto);
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

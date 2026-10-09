import { PartialType } from '@nestjs/swagger';
import { CreateAmbassadorDto } from './create-ambassador.dto';

export class UpdateAmbassadorDto extends PartialType(CreateAmbassadorDto) {}

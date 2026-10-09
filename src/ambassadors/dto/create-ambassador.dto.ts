import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsObject,
  IsString,
  IsNotEmpty,
  IsUrl,
} from 'class-validator';

export class CreateAmbassadorDto {
  @ApiProperty({ example: 'Ada Okafor' })
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @ApiProperty({ example: 'ada@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: '+2348012345678' })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiProperty({ example: 'Lagos' })
  @IsString()
  @IsNotEmpty()
  state: string;

  @ApiProperty({ example: 'University of Lagos' })
  @IsString()
  @IsNotEmpty()
  institution: string;

  @ApiProperty({ example: 'Computer Science' })
  @IsString()
  @IsNotEmpty()
  courseDepartment: string;

  @ApiProperty({ example: '300 level' })
  @IsString()
  @IsNotEmpty()
  level: string;

  @ApiProperty({
    example: { instagram: '@ada', tiktok: '@ada' },
    description: 'Social media platform names mapped to the ambassador handles',
    type: 'object',
    additionalProperties: { type: 'string' },
  })
  @IsObject()
  socialMediaHandles: Record<string, string>;

  @ApiProperty({ example: 'social media.' })
  @IsString()
  @IsNotEmpty()
  promotionPlan: string;

  @ApiProperty({ example: 'I will promote DOJU through campus events and social media.' })
  @IsString()
  promotionNotes: string;

  @ApiProperty({ example: 'UNILAG/2023/123456' })
  @IsString()
  @IsNotEmpty()
  studentMatricNo: string;

  @ApiProperty({ example: 'https://example.com/student-id-card.jpg' })
  @IsUrl()
  idCardUrl: string;
}

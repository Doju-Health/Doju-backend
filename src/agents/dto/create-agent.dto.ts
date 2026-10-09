import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsObject, IsString, IsNotEmpty, IsUrl } from "class-validator";

export class CreateAgentDto {
   @ApiProperty({ example: "John Doe" })
    @IsString()
    @IsNotEmpty()
    fullName: string;

    @ApiProperty({ example: "john.doe@example.com" })
    @IsEmail()
    email: string;

    @ApiProperty({ example: "+2348012345678" })
    @IsString()
    @IsNotEmpty()
    phone: string;

    @ApiProperty({ example: "Lagos" })
    @IsString()
    @IsNotEmpty()
    state: string;


    @ApiProperty ({ example: "Lagos, Ibadan, Ilorin"})
    @IsString()
    @IsNotEmpty()
    coverageAreas: string;


    @ApiProperty ({ example: "Pharmacist"})
    @IsString()
    @IsNotEmpty()
    occupation: string;

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

  @ApiProperty ({ example: '123456789'})
    @IsString()
    @IsNotEmpty()
    nin: string;

  @ApiProperty ({ example: "I want to be an agent because I want to help people access healthcare easily." })
  @IsString()
  @IsNotEmpty()
  motivation: string;

  @ApiProperty({ example: 'http://example.com/identity.jpg' })
  @IsUrl()
  identityDocument: string;

}

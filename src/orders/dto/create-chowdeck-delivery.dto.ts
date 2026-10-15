import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEmail,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class ChowdeckDeliveryContactDto {
  @ApiProperty({ example: 'Jane Smith' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: '08100000000' })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiPropertyOptional({ example: 'jane@example.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: 'NG' })
  @IsOptional()
  @IsString()
  country_code?: string;
}

export class CreateChowdeckDeliveryDto {
  @ApiProperty({ example: 12345, description: 'Must match this order’s saved Chowdeck fee quote ID' })
  @IsInt()
  @Min(1)
  fee_id: number;

  @ApiProperty({ example: 'documents' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  item_type: string;

  @ApiProperty({ example: 'sending', enum: ['sending', 'receiving'] })
  @IsIn(['sending', 'receiving'])
  user_action: 'sending' | 'receiving';

  @ApiProperty({ type: ChowdeckDeliveryContactDto })
  @ValidateNested()
  @Type(() => ChowdeckDeliveryContactDto)
  source_contact: ChowdeckDeliveryContactDto;

  @ApiProperty({ type: ChowdeckDeliveryContactDto })
  @ValidateNested()
  @Type(() => ChowdeckDeliveryContactDto)
  destination_contact: ChowdeckDeliveryContactDto;

  @ApiProperty({ example: 'Please handle with care' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  customer_delivery_note: string;

  @ApiProperty({ example: 4821, minimum: 1000, maximum: 9999 })
  @IsNumber()
  @Min(1000)
  @Max(9999)
  delivery_pin: number;
}

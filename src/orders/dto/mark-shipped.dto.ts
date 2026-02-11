import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class MarkShippedDto {
  @ApiPropertyOptional({
    description: 'Tracking number for the shipment (optional)',
    example: 'TRACK123456789',
  })
  @IsOptional()
  @IsString()
  trackingNumber?: string;
}

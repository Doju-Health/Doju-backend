import {
  IsNotEmpty,
  IsString,
  IsEnum,
  IsOptional,
  IsDateString,
  IsUrl,
} from 'class-validator';
import { TrackingStatus } from '../enums/tracking.enum';

export class CreateTrackingUpdateDto {
  @IsNotEmpty()
  @IsEnum(TrackingStatus)
  status: TrackingStatus;

  @IsNotEmpty()
  @IsString()
  location: string;

  @IsNotEmpty()
  @IsString()
  description: string;

  @IsOptional()
  @IsDateString()
  estimatedDeliveryDate?: string;

  @IsOptional()
  @IsUrl()
  imageUrl?: string; // Optional proof photo (packing, shipping, delivery)
}

export class MarkAsDeliveredDto {
  @IsNotEmpty()
  @IsString()
  receiverName: string;

  @IsOptional()
  @IsUrl()
  signatureUrl?: string; // Photo of signature or delivery proof

  @IsOptional()
  @IsString()
  deliveryNotes?: string;
}

import { Injectable, BadRequestException } from '@nestjs/common';
import { DeliveryZone } from './delivery-zone.service';

export interface DeliveryRate {
  smallPack: number;
  mediumPack: number;
  largePack: number;
  estimatedDays: string;
}

@Injectable()
export class DeliveryRateCardService {
  private rateCard: Map<string, DeliveryRate> = new Map();

  constructor() {
    this.initializeRateCard();
  }

  private initializeRateCard() {
    // Format: "ZONE_X-ZONE_Y"
    this.rateCard.set('1-1', {
      smallPack: 1400,
      mediumPack: 3600,
      largePack: 5800,
      estimatedDays: '1 - 2',
    });
    this.rateCard.set('1-2', {
      smallPack: 1400,
      mediumPack: 3800,
      largePack: 6000,
      estimatedDays: '2 - 4',
    });
    this.rateCard.set('1-3', {
      smallPack: 1700,
      mediumPack: 5000,
      largePack: 15000,
      estimatedDays: '3 - 7',
    });
    this.rateCard.set('1-4', {
      smallPack: 1400,
      mediumPack: 3500,
      largePack: 15000,
      estimatedDays: '4 - 9',
    });
    this.rateCard.set('1-5', {
      smallPack: 1600,
      mediumPack: 7000,
      largePack: 22000,
      estimatedDays: '3 - 9',
    });
    this.rateCard.set('1-6', {
      smallPack: 1900,
      mediumPack: 7100,
      largePack: 26000,
      estimatedDays: '8 - 9',
    });
    this.rateCard.set('1-7', {
      smallPack: 1800,
      mediumPack: 7800,
      largePack: 30000,
      estimatedDays: '4 - 9',
    });
    this.rateCard.set('2-2', {
      smallPack: 2200,
      mediumPack: 3800,
      largePack: 6000,
      estimatedDays: '5 - 7',
    });
    this.rateCard.set('2-3', {
      smallPack: 2600,
      mediumPack: 5700,
      largePack: 18000,
      estimatedDays: '7 - 10',
    });
    this.rateCard.set('2-4', {
      smallPack: 2100,
      mediumPack: 3600,
      largePack: 18000,
      estimatedDays: '8 - 13',
    });
    this.rateCard.set('2-5', {
      smallPack: 2500,
      mediumPack: 7000,
      largePack: 25000,
      estimatedDays: '7 - 13',
    });
    this.rateCard.set('2-6', {
      smallPack: 2800,
      mediumPack: 7500,
      largePack: 26000,
      estimatedDays: '8 - 12',
    });
    this.rateCard.set('2-7', {
      smallPack: 2900,
      mediumPack: 8500,
      largePack: 30000,
      estimatedDays: '8 - 13',
    });
    this.rateCard.set('3-3', {
      smallPack: 3000,
      mediumPack: 7000,
      largePack: 20000,
      estimatedDays: '7 - 10',
    });
    this.rateCard.set('3-4', {
      smallPack: 2500,
      mediumPack: 5500,
      largePack: 22000,
      estimatedDays: '8 - 12',
    });
    this.rateCard.set('3-5', {
      smallPack: 3000,
      mediumPack: 9000,
      largePack: 25000,
      estimatedDays: '8 - 14',
    });
    this.rateCard.set('3-6', {
      smallPack: 3500,
      mediumPack: 9000,
      largePack: 30000,
      estimatedDays: '12 - 14',
    });
    this.rateCard.set('3-7', {
      smallPack: 3300,
      mediumPack: 10000,
      largePack: 30000,
      estimatedDays: '12 - 14',
    });
    this.rateCard.set('4-4', {
      smallPack: 2100,
      mediumPack: 4000,
      largePack: 16000,
      estimatedDays: '10 - 12',
    });
    this.rateCard.set('4-5', {
      smallPack: 2500,
      mediumPack: 7500,
      largePack: 23000,
      estimatedDays: '8 - 12',
    });
    this.rateCard.set('4-6', {
      smallPack: 2900,
      mediumPack: 7500,
      largePack: 30000,
      estimatedDays: '12 - 14',
    });
    this.rateCard.set('4-7', {
      smallPack: 2800,
      mediumPack: 8000,
      largePack: 30000,
      estimatedDays: '8 - 12',
    });
    this.rateCard.set('5-5', {
      smallPack: 2900,
      mediumPack: 10000,
      largePack: 26000,
      estimatedDays: '12 - 14',
    });
    this.rateCard.set('5-6', {
      smallPack: 3500,
      mediumPack: 11000,
      largePack: 30000,
      estimatedDays: '8 - 17',
    });
    this.rateCard.set('5-7', {
      smallPack: 3500,
      mediumPack: 11000,
      largePack: 30000,
      estimatedDays: '16 - 17',
    });
    this.rateCard.set('6-6', {
      smallPack: 3500,
      mediumPack: 11000,
      largePack: 30000,
      estimatedDays: '12 - 14',
    });
    this.rateCard.set('6-7', {
      smallPack: 3500,
      mediumPack: 11000,
      largePack: 35000,
      estimatedDays: '12 - 17',
    });
    this.rateCard.set('7-7', {
      smallPack: 3500,
      mediumPack: 12000,
      largePack: 35000,
      estimatedDays: '8 - 12',
    });
  }

  /**
   * Get delivery fee based on zones and package size
   */
  getDeliveryFee(
    departureZone: DeliveryZone,
    arrivalZone: DeliveryZone,
    packageSize: 'small' | 'medium' | 'large',
  ): { fee: number; estimatedDays: string } {
    const key = `${departureZone}-${arrivalZone}`;
    const rate = this.rateCard.get(key);

    if (!rate) {
      throw new BadRequestException(
        `No delivery rate found for zones ${departureZone} to ${arrivalZone}`,
      );
    }

    let fee: number;
    switch (packageSize) {
      case 'small':
        fee = rate.smallPack;
        break;
      case 'medium':
        fee = rate.mediumPack;
        break;
      case 'large':
        fee = rate.largePack;
        break;
      default:
        throw new BadRequestException(`Invalid package size: ${packageSize}`);
    }

    return { fee, estimatedDays: rate.estimatedDays };
  }

  /**
   * Get all available rates for a route
   */
  getRatesForRoute(
    departureZone: DeliveryZone,
    arrivalZone: DeliveryZone,
  ): DeliveryRate | null {
    const key = `${departureZone}-${arrivalZone}`;
    return this.rateCard.get(key) || null;
  }
}

import { Injectable, BadRequestException } from '@nestjs/common';

export enum DeliveryZone {
  ZONE_1 = 1,
  ZONE_2 = 2,
  ZONE_3 = 3,
  ZONE_4 = 4,
  ZONE_5 = 5,
  ZONE_6 = 6,
  ZONE_7 = 7,
}

@Injectable()
export class DeliveryZoneService {
  private zoneMapping = {
    [DeliveryZone.ZONE_1]: ['Lagos'],
    [DeliveryZone.ZONE_2]: [
      'Agbara',
      'Mowe Ibafo',
      'Ajah',
      'Akute',
      'Awoyaya',
      'Badagry',
      'Epe',
      'Ibeju-Lekki',
      'Ijanikin',
      'Ikorodu',
      'Ojo',
      'Ojokoro',
      'Okokomaiko',
      'Sagamu',
    ],
    [DeliveryZone.ZONE_3]: [
      'Abeokuta',
      'Abuja',
      'Port Harcourt',
      'Akure',
      'Awka',
      'Ibadan',
      'Asaba',
      'Benin',
      'Eleme',
      'Gwagwalada',
      'Idu',
      'Nnewi',
      'Obantoko',
      'Onitsha',
      'Osogbo',
      'Owerri',
      'Oyigbo',
    ],
    [DeliveryZone.ZONE_4]: [
      'Ado Ekiti',
      'Agbor',
      'Akoko',
      'Ede',
      'Ikire',
      'Ikirun',
      'Ile Ife',
      'Ilesha',
      'Iwo',
      'Masaka',
      'Nsukka',
      'Offa',
      'Ogbomosho',
      'Ilorin',
      'Ondo Town',
      'Ore',
      'Owo',
      'Oyo Town',
      'Umuahia',
    ],
    [DeliveryZone.ZONE_5]: [
      'Aba',
      'Ago Iwoye',
      'Calabar',
      'Enugu',
      'Ijebu Igbo',
      'Ijebu Ode',
      'Ikot Ekpene',
      'Ilaro',
      'Ilishan Remo',
      'Iperu',
      'Jos',
      'Kaduna',
      'Maiduguri',
      'Minna',
      'Sango Otta',
      'Redeemed Camp',
      'Uyo',
      'Warri',
      'Yenagoa',
    ],
    [DeliveryZone.ZONE_6]: [
      'Abakaliki',
      'Bauchi',
      'Kano',
      'Eket',
      'Gombe',
      'Lokoja',
      'Okene',
      'Suleja',
      'Udu',
      'Yola',
      'Zaria',
    ],
    [DeliveryZone.ZONE_7]: [
      'Abraka',
      'Agbarho',
      'Bonny Island',
      'Egor',
      'Ekpoma',
      'Etsako',
      'Fupre',
      'Keffi',
      'Lafia',
      'Markurdi',
      'Obiaruku',
      'Oghara',
      'Ozoro',
      'Sapele',
      'Ughelli',
      'Uromi',
    ],
  };

  /**
   * Extract city/location from address string
   * Expected format: "Street, City, State"
   * Example: "123 Main Street, Ikorodu, Oyo state"
   * NOTE: Prefer passing city directly - this is fallback only
   */
  extractCity(address: string): string {
    const parts = address.split(',').map((part) => part.trim());
    // City is typically the second part
    return parts.length >= 2 ? parts[1] : '';
  }

  /**
   * Get zone number based on city
   */
  getZoneByCity(city: string): DeliveryZone {
    if (!city || city.trim().length === 0) {
      throw new BadRequestException('City is required for zone determination');
    }

    const normalizedCity = city.trim().toLowerCase();

    for (const [zone, cities] of Object.entries(this.zoneMapping)) {
      if (
        cities.some(
          (c) =>
            c.toLowerCase() === normalizedCity ||
            normalizedCity.includes(c.toLowerCase()) ||
            c.toLowerCase().includes(normalizedCity),
        )
      ) {
        return parseInt(zone) as DeliveryZone;
      }
    }
    throw new BadRequestException(`Delivery not available for city: ${city}`);
  }

  /**
   * Get zone from full address (legacy - prefer passing city directly)
   */
  getZoneFromAddress(address: string): DeliveryZone {
    const city = this.extractCity(address);
    if (!city) {
      throw new BadRequestException('Invalid address format - city not found');
    }
    return this.getZoneByCity(city);
  }

  /**
   * Get zone name
   */
  getZoneName(zone: DeliveryZone): string {
    return `Zone ${zone}`;
  }
}

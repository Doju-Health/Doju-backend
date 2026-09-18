import { DeliveryRateCardService } from './delivery-rate-card.service';
import { DeliveryZone } from './delivery-zone.service';

describe('DeliveryRateCardService', () => {
  let service: DeliveryRateCardService;

  beforeEach(() => {
    service = new DeliveryRateCardService();
  });

  it('should reuse the same delivery rate when the reverse route is not explicitly listed', () => {
    const quote = service.getDeliveryFee(
      DeliveryZone.ZONE_4,
      DeliveryZone.ZONE_3,
      'small',
    );

    expect(quote.fee).toBe(2500);
    expect(quote.estimatedDays).toBe('8 - 12');
  });

  it('should also work for the reverse route when only one direction is defined', () => {
    const quote = service.getDeliveryFee(
      DeliveryZone.ZONE_3,
      DeliveryZone.ZONE_4,
      'small',
    );

    expect(quote.fee).toBe(2500);
    expect(quote.estimatedDays).toBe('8 - 12');
  });

  it('should mirror the same rate across several reverse routes', () => {
    expect(
      service.getDeliveryFee(DeliveryZone.ZONE_2, DeliveryZone.ZONE_7, 'small')
        .fee,
    ).toBe(2900);

    expect(
      service.getDeliveryFee(DeliveryZone.ZONE_7, DeliveryZone.ZONE_2, 'small')
        .fee,
    ).toBe(2900);

    expect(
      service.getDeliveryFee(DeliveryZone.ZONE_5, DeliveryZone.ZONE_1, 'small')
        .fee,
    ).toBe(1600);

    expect(
      service.getDeliveryFee(DeliveryZone.ZONE_1, DeliveryZone.ZONE_5, 'small')
        .fee,
    ).toBe(1600);
  });
});

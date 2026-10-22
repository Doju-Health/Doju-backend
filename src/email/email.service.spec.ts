import { Test, TestingModule } from '@nestjs/testing';
import { EmailService } from './email.service';

process.env.RESEND_API_KEY = process.env.RESEND_API_KEY || 'test-api-key';

describe('EmailService', () => {
  let service: EmailService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EmailService],
    }).compile();

    service = module.get<EmailService>(EmailService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should include pickupStore in the seller purchase email', async () => {
    const send = jest.fn().mockResolvedValue({});
    (service as any).resend = { emails: { send } };

    await service.sendProductPurchasedEmail({
      sellerEmail: 'seller@example.com',
      buyerName: 'Jane Doe',
      buyerLocation: 'Lagos',
      productName: 'Rice',
      quantity: 2,
      unitPrice: '2500',
      totalPaid: '5000',
      purchaseTime: '2026-09-23 10:00',
      expectedDeliveryDate: '2026-09-25',
      deliveryAddress: '123 Main St',
      deliveryFee: '500',
      pickupStore: 'Ikeja Market',
      orderDetailsUrl: 'https://example.com/orders/1',
    } as any);

    expect(send).toHaveBeenCalledTimes(1);
    const html = send.mock.calls[0][0].html;
    expect(html).toContain('Pickup Store');
    expect(html).toContain('Ikeja Market');
  });
});

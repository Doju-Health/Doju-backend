import { Test, TestingModule } from '@nestjs/testing';
import { SellerDashboardService } from './seller-dashboard.service';

describe('SellerDashboardService', () => {
  let service: SellerDashboardService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SellerDashboardService],
    }).compile();

    service = module.get<SellerDashboardService>(SellerDashboardService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

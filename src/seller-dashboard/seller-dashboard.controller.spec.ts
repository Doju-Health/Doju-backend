import { Test, TestingModule } from '@nestjs/testing';
import { SellerDashboardController } from './seller-dashboard.controller';

describe('SellerDashboardController', () => {
  let controller: SellerDashboardController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SellerDashboardController],
    }).compile();

    controller = module.get<SellerDashboardController>(SellerDashboardController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});

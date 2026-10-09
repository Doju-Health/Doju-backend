import { Test, TestingModule } from '@nestjs/testing';
import { AmbassadorsController } from './ambassadors.controller';
import { AmbassadorsService } from './ambassadors.service';

describe('AmbassadorsController', () => {
  let controller: AmbassadorsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AmbassadorsController],
      providers: [AmbassadorsService],
    }).compile();

    controller = module.get<AmbassadorsController>(AmbassadorsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});

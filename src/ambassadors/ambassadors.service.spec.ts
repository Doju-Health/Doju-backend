import { Test, TestingModule } from '@nestjs/testing';
import { AmbassadorsService } from './ambassadors.service';

describe('AmbassadorsService', () => {
  let service: AmbassadorsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AmbassadorsService],
    }).compile();

    service = module.get<AmbassadorsService>(AmbassadorsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { BlogsController } from './blogs.controller';
import { BlogsService } from './blogs.service';

describe('BlogsController', () => {
  let controller: BlogsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BlogsController],
      providers: [BlogsService],
    }).compile();

    controller = module.get<BlogsController>(BlogsController);
  });
//Define a test case to check if the controller is defined
  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { ModbusService } from './modbus.service';

describe('ModbusService', () => {
  let service: ModbusService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ModbusService],
    }).compile();

    service = module.get<ModbusService>(ModbusService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

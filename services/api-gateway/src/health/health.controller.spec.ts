import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { of, throwError } from 'rxjs';
import { AxiosResponse } from 'axios';
import { HealthController } from './health.controller';

const mockHttpService = {
  get: jest.fn(),
};

describe('HealthController (API Gateway)', () => {
  let controller: HealthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [{ provide: HttpService, useValue: mockHttpService }],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  afterEach(() => jest.clearAllMocks());

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('check', () => {
    it('debería retornar status ok con servicios downstream saludables', async () => {
      const axiosOk = { data: { status: 'ok' }, status: 200 } as AxiosResponse;
      mockHttpService.get.mockReturnValue(of(axiosOk));

      const result = await controller.check();

      expect(result.status).toBe('ok');
      expect(result.service).toBe('api-gateway');
      expect(result.downstream.auth).toBe('ok');
      expect(result.downstream.users).toBe('ok');
      expect(result).toHaveProperty('timestamp');
    });

    it('debería marcar servicios como unavailable si no responden', async () => {
      mockHttpService.get.mockReturnValue(
        throwError(() => new Error('ECONNREFUSED')),
      );

      const result = await controller.check();

      expect(result.status).toBe('ok');
      expect(result.downstream.auth).toBe('unavailable');
      expect(result.downstream.users).toBe('unavailable');
    });

    it('debería manejar respuestas mixtas (un servicio ok, otro caído)', async () => {
      const axiosOk = { data: { status: 'ok' } } as AxiosResponse;

      // Primera llamada (auth) → ok, segunda (users) → error
      mockHttpService.get
        .mockReturnValueOnce(of(axiosOk))
        .mockReturnValueOnce(throwError(() => new Error('timeout')));

      const result = await controller.check();

      expect(result.downstream.auth).toBe('ok');
      expect(result.downstream.users).toBe('unavailable');
    });
  });
});

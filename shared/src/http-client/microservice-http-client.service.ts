import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { AxiosRequestConfig } from 'axios';

@Injectable()
export class MicroserviceHttpClient {
  private readonly logger = new Logger('MicroserviceHttpClient');

  private readonly serviceUrls: Record<string, string> = {
    auth: process.env.AUTH_SERVICE_URL || 'http://localhost:3001',
    user: process.env.USER_SERVICE_URL || 'http://localhost:3002',
    student: process.env.STUDENT_SERVICE_URL || 'http://localhost:3003',
    company: process.env.COMPANY_SERVICE_URL || 'http://localhost:3004',
    project: process.env.PROJECT_SERVICE_URL || 'http://localhost:3005',
    application: process.env.APPLICATION_SERVICE_URL || 'http://localhost:3006',
    matching: process.env.MATCHING_SERVICE_URL || 'http://localhost:3007',
    evaluation: process.env.EVALUATION_SERVICE_URL || 'http://localhost:3008',
    notification: process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3009',
    chat: process.env.CHAT_SERVICE_URL || 'http://localhost:3010',
    admin: process.env.ADMIN_SERVICE_URL || 'http://localhost:3011',
    analytics: process.env.ANALYTICS_SERVICE_URL || 'http://localhost:3012',
    storage: process.env.STORAGE_SERVICE_URL || 'http://localhost:3013',
  };

  constructor(private readonly httpService: HttpService) {}

  private getBaseUrl(service: string): string {
    const url = this.serviceUrls[service];
    if (!url) throw new Error(`Servicio desconocido: ${service}`);
    return url;
  }

  async get<T>(service: string, path: string, config?: AxiosRequestConfig): Promise<T> {
    const url = `${this.getBaseUrl(service)}${path}`;
    this.logger.debug(`GET ${url}`);
    const response = await firstValueFrom(
      this.httpService.get<T>(url, { timeout: 5000, ...config }),
    );
    return response.data;
  }

  async post<T>(service: string, path: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const url = `${this.getBaseUrl(service)}${path}`;
    this.logger.debug(`POST ${url}`);
    const response = await firstValueFrom(
      this.httpService.post<T>(url, data, { timeout: 5000, ...config }),
    );
    return response.data;
  }

  async patch<T>(service: string, path: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const url = `${this.getBaseUrl(service)}${path}`;
    this.logger.debug(`PATCH ${url}`);
    const response = await firstValueFrom(
      this.httpService.patch<T>(url, data, { timeout: 5000, ...config }),
    );
    return response.data;
  }

  async put<T>(service: string, path: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const url = `${this.getBaseUrl(service)}${path}`;
    this.logger.debug(`PUT ${url}`);
    const response = await firstValueFrom(
      this.httpService.put<T>(url, data, { timeout: 5000, ...config }),
    );
    return response.data;
  }

  async delete<T>(service: string, path: string, config?: AxiosRequestConfig): Promise<T> {
    const url = `${this.getBaseUrl(service)}${path}`;
    this.logger.debug(`DELETE ${url}`);
    const response = await firstValueFrom(
      this.httpService.delete<T>(url, { timeout: 5000, ...config }),
    );
    return response.data;
  }
}

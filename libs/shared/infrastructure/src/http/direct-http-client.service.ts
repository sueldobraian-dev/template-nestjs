import { Injectable, Logger } from '@nestjs/common';
import { RequestContextService } from '../context/request-context.service';
import { HttpRequestOptions, HttpResponse } from './http-client.interface';

@Injectable()
export class DirectHttpClientService {
  private readonly logger = new Logger(DirectHttpClientService.name);

  constructor(private readonly contextService: RequestContextService) {}

  public async get<T>(
    url: string,
    options?: HttpRequestOptions
  ): Promise<HttpResponse<T>> {
    return this.request<T>('GET', url, options);
  }

  public async post<T>(
    url: string,
    body?: unknown,
    options?: HttpRequestOptions
  ): Promise<HttpResponse<T>> {
    return this.request<T>('POST', url, { ...options, body });
  }

  public async put<T>(
    url: string,
    body?: unknown,
    options?: HttpRequestOptions
  ): Promise<HttpResponse<T>> {
    return this.request<T>('PUT', url, { ...options, body });
  }

  public async delete<T>(
    url: string,
    options?: HttpRequestOptions
  ): Promise<HttpResponse<T>> {
    return this.request<T>('DELETE', url, options);
  }

  public async request<T>(
    method: string,
    url: string,
    options?: HttpRequestOptions
  ): Promise<HttpResponse<T>> {
    const correlationId = this.contextService.getCorrelationId();
    const finalUrl = this.buildUrl(url, options?.params);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'x-correlation-id': correlationId,
      ...(options?.headers ?? {}),
    };

    const timeoutMs = options?.timeoutMs ?? 10_000;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const requestInit: RequestInit = {
      method,
      headers,
      signal: controller.signal,
    };

    if (options?.body !== undefined && method !== 'GET' && method !== 'HEAD') {
      requestInit.body =
        typeof options.body === 'string'
          ? options.body
          : JSON.stringify(options.body);
    }

    try {
      const response = await fetch(finalUrl, requestInit);
      clearTimeout(timeoutId);

      const contentType = response.headers.get('content-type') ?? '';
      let data: unknown = null;

      if (contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const text = await response.text();
        data = text ? text : null;
      }

      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((val, key) => {
        responseHeaders[key] = val;
      });

      if (!response.ok) {
        this.logger.warn(
          `Llamada HTTP a '${finalUrl}' retornó status ${response.status} (correlationId='${correlationId}')`
        );
      }

      return {
        status: response.status,
        headers: responseHeaders,
        data: data as T,
      };
    } catch (error) {
      clearTimeout(timeoutId);
      this.logger.error(
        `Error en petición HTTP ${method} '${finalUrl}': ${error instanceof Error ? error.message : String(error)}`
      );
      throw error;
    }
  }

  private buildUrl(
    baseUrl: string,
    params?: Record<string, string | number | boolean>
  ): string {
    if (!params || Object.keys(params).length === 0) {
      return baseUrl;
    }

    const url = new URL(baseUrl);
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, String(value));
      }
    }
    return url.toString();
  }
}

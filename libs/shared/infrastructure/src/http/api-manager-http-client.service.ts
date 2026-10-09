import { Injectable, Logger } from '@nestjs/common';
import { OAuth2TokenService } from './oauth2-token.service';
import { DirectHttpClientService } from './direct-http-client.service';
import {
  ApiManagerConfig,
  HttpRequestOptions,
  HttpResponse,
} from './http-client.interface';

@Injectable()
export class ApiManagerHttpClientService {
  private readonly logger = new Logger(ApiManagerHttpClientService.name);

  constructor(
    private readonly tokenService: OAuth2TokenService,
    private readonly directClient: DirectHttpClientService
  ) {}

  public async get<T>(
    endpointPath: string,
    config: ApiManagerConfig,
    options?: HttpRequestOptions
  ): Promise<HttpResponse<T>> {
    return this.request<T>('GET', endpointPath, config, options);
  }

  public async post<T>(
    endpointPath: string,
    body: unknown,
    config: ApiManagerConfig,
    options?: HttpRequestOptions
  ): Promise<HttpResponse<T>> {
    return this.request<T>('POST', endpointPath, config, { ...options, body });
  }

  public async put<T>(
    endpointPath: string,
    body: unknown,
    config: ApiManagerConfig,
    options?: HttpRequestOptions
  ): Promise<HttpResponse<T>> {
    return this.request<T>('PUT', endpointPath, config, { ...options, body });
  }

  public async delete<T>(
    endpointPath: string,
    config: ApiManagerConfig,
    options?: HttpRequestOptions
  ): Promise<HttpResponse<T>> {
    return this.request<T>('DELETE', endpointPath, config, options);
  }

  public async request<T>(
    method: string,
    endpointPath: string,
    config: ApiManagerConfig,
    options?: HttpRequestOptions
  ): Promise<HttpResponse<T>> {
    // 1. Obtener o reutilizar el token OAuth2 desde la cache
    const accessToken = await this.tokenService.getAccessToken(config.oauth2);

    // 2. Preparar cabeceras requeridas por el API Manager
    const subscriptionHeader =
      config.subscriptionHeaderName ?? 'Ocp-Apim-Subscription-Key';

    const mergedHeaders: Record<string, string> = {
      Authorization: `Bearer ${accessToken}`,
      ...(options?.headers ?? {}),
    };

    if (config.subscriptionKey) {
      mergedHeaders[subscriptionHeader] = config.subscriptionKey;
    }

    // 3. Resolver URL absoluta a partir de la baseUrl del API Manager
    const fullUrl = this.resolveUrl(config.baseUrl, endpointPath);

    const mergedOptions: HttpRequestOptions = {
      ...options,
      headers: mergedHeaders,
      timeoutMs: options?.timeoutMs ?? config.defaultTimeoutMs ?? 15_000,
    };

    this.logger.debug(
      `Despachando petición autenticada OAuth2 hacia API Manager: ${method} ${fullUrl}`
    );

    // 4. Delegar en el DirectHttpClient para trazabilidad (correlationId) y timeout
    return this.directClient.request<T>(method, fullUrl, mergedOptions);
  }

  private resolveUrl(baseUrl: string, path: string): string {
    const sanitizedBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    const sanitizedPath = path.startsWith('/') ? path : `/${path}`;
    return `${sanitizedBase}${sanitizedPath}`;
  }
}

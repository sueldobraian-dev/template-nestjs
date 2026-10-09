import { OAuth2TokenService } from '../src/http/oauth2-token.service';
import { DirectHttpClientService } from '../src/http/direct-http-client.service';
import { ApiManagerHttpClientService } from '../src/http/api-manager-http-client.service';
import { RequestContextService } from '../src/context/request-context.service';
import { OAuth2Config, ApiManagerConfig } from '../src/http/http-client.interface';

describe('HTTP & OAuth2 Client Infrastructure', () => {
  describe('OAuth2TokenService', () => {
    let service: OAuth2TokenService;
    const mockConfig: OAuth2Config = {
      tokenUrl: 'https://auth.enterprise.com/oauth/token',
      clientId: 'my-client-id',
      clientSecret: 'my-client-secret',
      scope: 'read:users write:users',
    };

    beforeEach(() => {
      service = new OAuth2TokenService();
      jest.restoreAllMocks();
    });

    it('should request access token via client_credentials and cache it', async () => {
      const mockFetch = jest.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => ({
          access_token: 'mock-jwt-token-xyz',
          token_type: 'Bearer',
          expires_in: 3600,
        }),
      } as Response);

      // Primera llamada: debe realizar petición HTTP
      const token1 = await service.getAccessToken(mockConfig);
      expect(token1).toBe('mock-jwt-token-xyz');
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Segunda llamada: debe recuperar desde la cache sin hacer nuevo fetch
      const token2 = await service.getAccessToken(mockConfig);
      expect(token2).toBe('mock-jwt-token-xyz');
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should throw an error if token endpoint returns failure status', async () => {
      jest.spyOn(global, 'fetch').mockResolvedValue({
        ok: false,
        status: 401,
        text: async () => 'Invalid client credentials',
      } as Response);

      await expect(service.getAccessToken(mockConfig)).rejects.toThrow(
        /Fallo al obtener OAuth2 token \(HTTP 401\)/
      );
    });
  });

  describe('DirectHttpClientService', () => {
    let service: DirectHttpClientService;
    let contextService: RequestContextService;

    beforeEach(() => {
      jest.restoreAllMocks();
      contextService = new RequestContextService();
      jest.spyOn(contextService, 'getCorrelationId').mockReturnValue('corr-test-http-123');
      service = new DirectHttpClientService(contextService);
    });

    it('should automatically inject x-correlation-id and serialize query parameters', async () => {
      const mockFetch = jest.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ status: 'ok', data: 42 }),
      } as Response);

      const response = await service.get('https://api.external.com/items', {
        params: { active: true, page: 1 },
      });

      expect(response.status).toBe(200);
      expect(response.data).toEqual({ status: 'ok', data: 42 });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.external.com/items?active=true&page=1',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'x-correlation-id': 'corr-test-http-123',
          }),
        })
      );
    });
  });

  describe('ApiManagerHttpClientService', () => {
    let service: ApiManagerHttpClientService;
    let tokenService: OAuth2TokenService;
    let directClient: DirectHttpClientService;

    const mockApiConfig: ApiManagerConfig = {
      baseUrl: 'https://gateway.enterprise.com/v1',
      subscriptionKey: 'sub-key-enterprise-999',
      subscriptionHeaderName: 'Ocp-Apim-Subscription-Key',
      oauth2: {
        tokenUrl: 'https://auth.enterprise.com/oauth/token',
        clientId: 'apim-client',
        clientSecret: 'apim-secret',
      },
    };

    beforeEach(() => {
      tokenService = new OAuth2TokenService();
      jest.spyOn(tokenService, 'getAccessToken').mockResolvedValue('bearer-token-abc');

      const contextService = new RequestContextService();
      directClient = new DirectHttpClientService(contextService);

      service = new ApiManagerHttpClientService(tokenService, directClient);
    });

    it('should inject OAuth2 Bearer token and subscription key into request headers', async () => {
      const requestSpy = jest.spyOn(directClient, 'request').mockResolvedValue({
        status: 200,
        headers: {},
        data: { success: true },
      });

      const result = await service.post('/notifications/send', { message: 'Hello' }, mockApiConfig);

      expect(tokenService.getAccessToken).toHaveBeenCalledWith(mockApiConfig.oauth2);
      expect(requestSpy).toHaveBeenCalledWith(
        'POST',
        'https://gateway.enterprise.com/v1/notifications/send',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer bearer-token-abc',
            'Ocp-Apim-Subscription-Key': 'sub-key-enterprise-999',
          }),
          body: { message: 'Hello' },
        })
      );
      expect(result.data).toEqual({ success: true });
    });
  });
});

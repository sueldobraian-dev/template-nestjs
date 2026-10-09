import { Injectable, Logger } from '@nestjs/common';
import { OAuth2Config } from './http-client.interface';

interface CachedToken {
  token: string;
  expiresAt: number;
}

@Injectable()
export class OAuth2TokenService {
  private readonly logger = new Logger(OAuth2TokenService.name);
  private readonly cache = new Map<string, CachedToken>();

  public async getAccessToken(config: OAuth2Config): Promise<string> {
    const cacheKey = this.buildCacheKey(config);
    const cached = this.cache.get(cacheKey);

    const now = Date.now();
    // Reutilizar token si aún tiene al menos 60 segundos de vigencia
    if (cached && cached.expiresAt > now + 60_000) {
      return cached.token;
    }

    this.logger.debug(
      `Solicitando nuevo OAuth2 token para client_id='${config.clientId}' en '${config.tokenUrl}'`
    );

    const params = new URLSearchParams();
    params.append('grant_type', 'client_credentials');
    params.append('client_id', config.clientId);
    params.append('client_secret', config.clientSecret);

    if (config.scope) {
      params.append('scope', config.scope);
    }
    if (config.audience) {
      params.append('audience', config.audience);
    }

    try {
      const response = await fetch(config.tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
        },
        body: params.toString(),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Fallo al obtener OAuth2 token (HTTP ${response.status}): ${errorText}`
        );
      }

      const body = (await response.json()) as {
        access_token: string;
        expires_in?: number;
      };

      if (!body.access_token) {
        throw new Error('La respuesta OAuth2 no contiene access_token válido.');
      }

      const expiresInSeconds = body.expires_in ?? 3600;
      const expiresAt = now + expiresInSeconds * 1000;

      this.cache.set(cacheKey, {
        token: body.access_token,
        expiresAt,
      });

      return body.access_token;
    } catch (error) {
      this.logger.error(
        `Error al autenticar OAuth2 con ${config.tokenUrl}: ${error instanceof Error ? error.message : String(error)}`
      );
      throw error;
    }
  }

  public clearCache(): void {
    this.cache.clear();
  }

  private buildCacheKey(config: OAuth2Config): string {
    return `${config.tokenUrl}::${config.clientId}::${config.scope ?? ''}::${config.audience ?? ''}`;
  }
}

export interface HttpRequestOptions {
  headers?: Record<string, string>;
  params?: Record<string, string | number | boolean>;
  timeoutMs?: number;
  body?: unknown;
}

export interface OAuth2Config {
  tokenUrl: string;
  clientId: string;
  clientSecret: string;
  scope?: string;
  audience?: string;
}

export interface ApiManagerConfig {
  baseUrl: string;
  oauth2: OAuth2Config;
  subscriptionKey?: string;
  subscriptionHeaderName?: string;
  defaultTimeoutMs?: number;
}

export interface HttpResponse<T = unknown> {
  status: number;
  headers: Record<string, string>;
  data: T;
}

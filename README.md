# Template NestJS Empresarial (Nx + CQRS + DDD + Pipeline Behaviors + Hexagonal)

Template backend empresarial y modular para **NestJS** en un monorepo de **Nx**, diseñado siguiendo principios de **Clean Architecture**, **Domain-Driven Design (DDD)**, **Hexagonal Ports & Adapters** y **CQRS** idiomático sobre `@nestjs/cqrs`.

Inspirado en las mejores prácticas de robustez empresarial (similares a los pipelines de MediatR y arquitecturas limpias de .NET), pero adaptado 100% al modelo asíncrono y de inyección de dependencias de Node.js y NestJS sin incurrir en antipatrones de migración.

---

## 🏛️ Arquitectura y Principios Clave

```mermaid
flowchart TD
    Client([HTTP Client / Microservice / Job]) -->|Request| Middleware[AsyncLocalStorage Middleware\nx-correlation-id]
    Middleware --> Controller[UsersController]
    Controller -->|Dispatch| PipeBus[PipelineCommandBus]
    
    subgraph "CQRS Pipeline Behaviors (Transport Agnostic)"
        PipeBus --> TracingBehavior[1. Tracing & Structured Logging Behavior]
        TracingBehavior --> ValBehavior[2. Zod Pre-Validation Behavior]
        ValBehavior --> Handler[3. RegisterUserCommandHandler]
    end
    
    subgraph "Hexagonal Outbound Ports & Adapters"
        Handler --> RepoPort[UserRepository Port (abstract class)]
        RepoPort -.-> RepoImpl[(InMemoryUserRepository Adapter)]
        
        Handler --> Domain[UserAggregate]
        Domain -->|apply| EventBuffer[Event Buffer]
        
        EventBuffer -.-> EventHandler[SendWelcomeEmailEventHandler]
        
        EventHandler --> DirectHttpPort[NotificationServicePort]
        DirectHttpPort -.-> DirectHttpAdapter[DirectNotificationAdapter\nDirectHttpClientService]
        DirectHttpAdapter --> ExtDirect([Servicio Externo URL Directa])
        
        EventHandler --> ApimPort[IdentityVerificationPort]
        ApimPort -.-> ApimAdapter[ApiManagerIdentityVerificationAdapter\nApiManagerHttpClientService + OAuth2TokenService]
        ApimAdapter --> APIM([API Gateway / APIManager + OAuth2])
    end
    
    Handler -->|Result.ok / fail| Controller
    Controller --> Interceptor[Response Envelope Interceptor]
    Interceptor -->|Unified JSON Response| Client
    
    GlobalFilter[Global Exception Filter] -.->|En caso de 500 o HttpExceptions| Client
```

1. **CQRS Pipeline Behaviors Agnósticos:** Cadena de responsabilidades inspirada en `IPipelineBehavior` de MediatR implementada en `PipelineCommandBus`. Ejecuta **Logging estructurado** (con sanitización de contraseñas y medición de latencia) y **Validación Zod** antes de invocar cualquier Command Handler, funcionando tanto para HTTP como para WebSockets, RabbitMQ, Kafka o Cron jobs.
2. **Contexto de Solicitud sin Penalización de Rendimiento (`AsyncLocalStorage`):** Preserva todos los servicios y repositorios como `Singleton` (evitando `Scope.REQUEST` que recrea árboles de dependencias). El `correlationId` se propaga de forma invisible y segura a través de `node:async_hooks`.
3. **Manejo Funcional de Errores (Result Pattern):** Las reglas de negocio esperadas (`USER_ALREADY_EXISTS`, `NOT_FOUND`, `VALIDATION_FAILED`) no lanzan excepciones; se retornan como valores fuertemente tipados con `Result.ok(T)` y `Result.fail(DomainError)`.
4. **Puertos de Dominio con Clases Abstractas:** Todo puerto de salida (`abstract class UserRepository`, `abstract class NotificationServicePort`, `abstract class IdentityVerificationPort`) preserva tokens de inyección en runtime sin recurrir a strings mágicos en `@Inject()`.
5. **Conexiones a Servicios Externos (URL Directa vs API Managers con OAuth2):**
   - **DirectHttpClientService:** Para llamadas a microservicios directos con propagación automática de `x-correlation-id`, timeouts configurables y serialización.
   - **ApiManagerHttpClientService & OAuth2TokenService:** Diseñado para APIs corporativas detrás de API Gateways (Azure APIM, Apigee, Kong, AWS Gateway). Maneja el flujo OAuth2 Client Credentials con **cache en memoria de tokens** (evitando saturar el STS en cada petición), auto-refresh antes de expirar e inyección de cabeceras de suscripción (`Ocp-Apim-Subscription-Key`).
6. **Formato de Respuesta Estandarizado:** Formato uniforme `{ success, data/error, meta: { correlationId, timestamp } }` gestionado por `ResponseEnvelopeInterceptor` y `GlobalExceptionFilter` (ocultando stack traces en producción).
7. **Documentación Interactiva Automática (Swagger + Scalar API Reference):** Generación de especificación OpenAPI usando el plugin CLI de `@nestjs/swagger` (introspección de JSDoc y `class-validator` sin decoradores repetitivos `@ApiProperty`) servida en tiempo real mediante **Scalar API Reference** en `/docs` con soporte para autenticación Bearer JWT.

---

## 📂 Estructura del Monorepo

```text
d:\Repositories\templates\template-nestjs\
├── apps/
│   └── api/                                 # Aplicación NestJS ejecutable
│       ├── src/
│       │   ├── app/
│       │   │   ├── users/                   # Vertical slice de Usuario
│       │   │   │   ├── application/         # Comandos, Handlers y Eventos de Dominio
│       │   │   │   │   ├── commands/        # RegisterUserCommand & Handler
│       │   │   │   │   └── events/          # UserRegisteredEvent & Handler
│       │   │   │   ├── domain/              # UserAggregate y Puertos de Salida
│       │   │   │   │   ├── ports/           # NotificationServicePort, IdentityVerificationPort
│       │   │   │   │   └── user.repository.port.ts
│       │   │   │   ├── infrastructure/      # Adaptadores de Salida
│       │   │   │   │   ├── adapters/        # DirectNotificationAdapter, ApiManagerIdentityVerificationAdapter
│       │   │   │   │   └── in-memory-user.repository.ts
│       │   │   │   └── presentation/        # DTOs y UsersController
│       │   │   ├── app.module.ts
│       │   │   └── users.module.ts
│       │   └── main.ts
│       └── tests/                           # Tests unitarios en Jest
├── libs/
│   └── shared/
│       ├── core/                            # Result Pattern, DomainError y catálogo de errores
│       ├── cqrs-pipeline/                   # PipelineCommandBus, LoggingBehavior y ValidationBehavior
│       └── infrastructure/                  # AsyncLocalStorage, Envelope Interceptor, Filter y Clientes HTTP (Direct & OAuth2/APIM)
├── .agents/
│   └── skills/
│       └── nestjs-cqrs-template/            # Skill de Anti-Gravity para adopción guiada
├── INSTRUCTION.md                           # Guía exhaustiva de ingeniería, recetas y checklist
├── nest-cli.json                            # Configuración del plugin Swagger CLI de NestJS
├── nx.json
├── package.json
└── tsconfig.base.json
```

---

## ⚙️ Variables de Entorno Recomendadas

Crea un archivo `.env` en la raíz (o configúralas en tu orquestador):

```env
PORT=3000
NODE_ENV=development

# Configuración para Servicios de URL Directa
NOTIFICATION_SERVICE_URL=https://notifications.internal.corp/api/v1/send-email

# Configuración para Servicios tras API Manager con OAuth2
APIM_GATEWAY_URL=https://apim.enterprise.com/identity/v1
APIM_SUBSCRIPTION_KEY=your-apim-subscription-key
OAUTH2_TOKEN_URL=https://login.microsoftonline.com/tenant-id/oauth2/v2.0/token
OAUTH2_CLIENT_ID=your-client-id
OAUTH2_CLIENT_SECRET=your-client-secret
OAUTH2_SCOPE=api://enterprise-identity/.default
```

---

## 🚀 Comandos Rápidos

### Instalación de dependencias
```bash
npm install
```

### Ejecutar todas las pruebas unitarias (Jest)
```bash
npm test
# O en modo detallado:
npm run test:verbose
```

### Compilación completa (TypeScript Strict)
```bash
npm run build
```

### Iniciar la API en desarrollo
```bash
npm run start:dev
```
- **API Base:** `http://localhost:3000/api`
- **Documentación Interactiva Scalar:** `http://localhost:3000/docs`

---

## 🧪 Pruebas del Vertical Slice en Runtime

### 1. Registro Exitoso (HTTP 201 Created)
```bash
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -H "x-correlation-id: test-req-001" \
  -d '{"email": "john.doe@enterprise.com", "name": "John Doe", "password": "StrongPassword123!"}'
```
**Respuesta:**
```json
{
  "success": true,
  "data": {
    "id": "516f2a2c-b95e-4645-8f05-cd10b4fe6cff",
    "email": "john.doe@enterprise.com",
    "name": "John Doe",
    "createdAt": "2026-10-08T01:50:21.905Z"
  },
  "meta": {
    "correlationId": "test-req-001",
    "timestamp": "2026-10-08T01:50:21.906Z"
  }
}
```

### 2. Conflicto de Negocio por Duplicado (HTTP 409 Conflict)
Vuelve a enviar la misma petición para verificar el retorno de `Result.fail`:
```json
{
  "success": false,
  "error": {
    "code": "USER_ALREADY_EXISTS",
    "message": "User with email 'john.doe@enterprise.com' already exists",
    "statusCode": 409,
    "details": {
      "email": "john.doe@enterprise.com"
    }
  },
  "meta": {
    "correlationId": "test-req-001",
    "timestamp": "2026-10-08T01:50:21.916Z"
  }
}
```

### 3. Validación Fallida de Entrada vía Zod (HTTP 422 Unprocessable Entity)
```bash
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{"email": "not-an-email", "name": "A", "password": "short"}'
```
**Respuesta:**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "Command validation failed",
    "statusCode": 422,
    "details": [
      { "field": "email", "message": "Email must be a valid email address" },
      { "field": "name", "message": "Name must be at least 2 characters long" },
      { "field": "password", "message": "Password must be at least 8 characters long" }
    ]
  },
  "meta": {
    "correlationId": "uuid-generado-automaticamente",
    "timestamp": "2026-10-08T01:50:21.921Z"
  }
}
```

---

## 📖 Documentación Adicional y Adopción

* **[INSTRUCTION.md](./INSTRUCTION.md):** Manual detallado para desarrolladores con reglas innegociables, recetas paso a paso para crear nuevos Vertical Slices, conectar APIs y checklist para Pull Requests.
* **Documentación de API con Scalar:** Accede a `http://localhost:3000/docs` para visualizar la especificación OpenAPI renderizada dinámicamente con **Scalar**, alimentada mediante introspección estática (JSDoc + `class-validator`) por `@nestjs/swagger/plugin`.
* **Skill de Anti-Gravity (`.agents/skills/nestjs-cqrs-template`):** Puedes invocar directamente al asistente en Anti-Gravity para generar nuevos endpoints, puertos de salida o adaptadores siguiendo strictly este patrón.

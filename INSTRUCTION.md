# Guía de Adopción y Desarrollo (INSTRUCTION.md)

Esta guía establece los estándares de ingeniería, convenciones y recetas paso a paso para cualquier desarrollador o equipo que adopte el **template-nestjs**.

---

## 1. Filosofía y Reglas Innegociables

Este template traslada la disciplina de arquitecturas limpias empresariales (DDD / CQRS / Hexagonal) al ecosistema de Node.js y NestJS, evitando antipatrones comunes.

### Reglas de Oro

1. **Inyección de Dependencias Limpia:**
   - Todo puerto de salida (repositorio, cliente HTTP, servicio de mensajería) **DEBE** declararse como una `abstract class` y **NUNCA** como una `interface` pura de TypeScript.
   - *Por qué:* Las `interfaces` desaparecen en tiempo de compilación. Las `abstract class` preservan el token de inyección en runtime sin requerir strings mágicos (`@Inject('REPO_TOKEN')`).

2. **Rendimiento y Singletons (Zero `Scope.REQUEST`):**
   - **TODOS** los servicios, controladores, repositorios y handlers deben ser `Scope.DEFAULT` (Singleton).
   - El contexto de la solicitud (`correlationId`, usuario autenticado, tenant) se propaga transparentemente mediante `RequestContextService` respaldado por `AsyncLocalStorage` (`node:async_hooks`).
   - *Por qué:* `Scope.REQUEST` en NestJS destruye y recrea el árbol completo de inyección de dependencias en cada llamada HTTP, degradando la latencia y la memoria.

3. **Manejo Funcional de Errores (Result Pattern):**
   - **NO** utilices `throw new BadRequestException(...)` o excepciones genéricas para flujos de negocio previstos (ej. usuario duplicado, saldo insuficiente, recurso no encontrado).
   - Retorna siempre `Result.ok(valor)` o `Result.fail(new SpecificDomainError(...))`.
   - El `ResponseEnvelopeInterceptor` se encarga automáticamente de desempaquetar el `Result`, asignar el código HTTP correspondiente (200, 201, 404, 409, 422) y estructurar el payload estándar.
   - Reserva `throw` y el `GlobalExceptionFilter` exclusivamente para excepciones técnicas no recuperables (500, fallos de red inesperados).

4. **Pipeline Behaviors Agnósticos:**
   - La validación de comandos (Zod) y el logging estructurado ocurren antes de que el comando alcance el handler a través del `PipelineCommandBus`.
   - No ensucies los controladores con validaciones manuales ni los handlers con lógica de logging repetitiva.

5. **Aislamiento de Servicios Externos:**
   - Para consumir APIs externas, utiliza los clientes provistos en `@shared/infrastructure`:
     - **DirectHttpClientService:** Para endpoints directos por URL (con timeout y `x-correlation-id`).
     - **ApiManagerHttpClientService + OAuth2TokenService:** Para APIs corporativas protegidas por API Gateways / API Managers que requieren Client Credentials OAuth2 y caching de tokens.

---

## 2. Recetas Paso a Paso

### Receta A: Crear un Nuevo Vertical Slice

Para agregar una nueva funcionalidad (ej. `products`):

1. **Crea la estructura de carpetas en `apps/api/src/app/products/`:**
   ```text
   products/
   ├── application/
   │   ├── commands/
   │   │   ├── create-product.command.ts
   │   │   └── create-product.handler.ts
   │   └── events/
   │       └── product-created.event.ts
   ├── domain/
   │   ├── product.aggregate.ts
   │   ├── product.repository.port.ts
   │   └── errors/
   │       └── product-already-exists.error.ts
   ├── infrastructure/
   │   └── in-memory-product.repository.ts
   ├── presentation/
   │   ├── dtos/
   │   │   └── create-product.dto.ts
   │   └── products.controller.ts
   └── products.module.ts
   ```

2. **Define el Agregado de Dominio:**
   ```typescript
   import { AggregateRoot } from '@nestjs/cqrs';
   import { randomUUID } from 'node:crypto';
   import { ProductCreatedEvent } from '../application/events/product-created.event';

   export class ProductAggregate extends AggregateRoot {
     private constructor(
       public readonly id: string,
       public readonly sku: string,
       public readonly name: string,
       public readonly price: number
     ) {
       super();
     }

     public static create(sku: string, name: string, price: number): ProductAggregate {
       const id = randomUUID();
       const product = new ProductAggregate(id, sku, name, price);
       product.apply(new ProductCreatedEvent(id, sku, name, price));
       return product;
     }
   }
   ```

3. **Define el Puerto del Repositorio:**
   ```typescript
   import { ProductAggregate } from './product.aggregate';

   export abstract class ProductRepository {
     abstract findBySku(sku: string): Promise<ProductAggregate | null>;
     abstract save(product: ProductAggregate): Promise<void>;
   }
   ```

4. **Define el Comando con Validación Zod:**
   ```typescript
   import { ICommand } from '@nestjs/cqrs';
   import { z } from 'zod';
   import { ValidatableCommand } from '@shared/cqrs-pipeline';

   export class CreateProductCommand implements ValidatableCommand, ICommand {
     public static readonly schema = z.object({
       sku: z.string().min(3),
       name: z.string().min(2),
       price: z.number().positive(),
     });

     public readonly schema = CreateProductCommand.schema;

     constructor(
       public readonly sku: string,
       public readonly name: string,
       public readonly price: number
     ) {}
   }
   ```

5. **Implementa el Command Handler:**
   ```typescript
   import { CommandHandler, EventPublisher, ICommandHandler } from '@nestjs/cqrs';
   import { Result, DomainError, ConflictError } from '@shared/core';
   import { CreateProductCommand } from './create-product.command';
   import { ProductRepository } from '../../domain/product.repository.port';
   import { ProductAggregate } from '../../domain/product.aggregate';

   @CommandHandler(CreateProductCommand)
   export class CreateProductCommandHandler
     implements ICommandHandler<CreateProductCommand, Result<ProductAggregate, DomainError>>
   {
     constructor(
       private readonly repository: ProductRepository,
       private readonly publisher: EventPublisher
     ) {}

     async execute(command: CreateProductCommand): Promise<Result<ProductAggregate, DomainError>> {
       const existing = await this.repository.findBySku(command.sku);
       if (existing) {
         return Result.fail(new ConflictError(`Producto con SKU ${command.sku} ya existe`));
       }

       const product = ProductAggregate.create(command.sku, command.name, command.price);
       await this.repository.save(product);

       const productWithEvents = this.publisher.mergeObjectContext(product);
       productWithEvents.commit();

       return Result.ok(product);
     }
   }
   ```

6. **Implementa el Controlador:**
   ```typescript
   import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
   import { PipelineCommandBus } from '@shared/cqrs-pipeline';
   import { CreateProductCommand } from '../application/commands/create-product.command';

   @Controller('products')
   export class ProductsController {
     constructor(private readonly commandBus: PipelineCommandBus) {}

     @Post()
     @HttpCode(HttpStatus.CREATED)
     async create(@Body() body: { sku: string; name: string; price: number }) {
       const command = new CreateProductCommand(body.sku, body.name, body.price);
       const result = await this.commandBus.execute(command);
       return result;
     }
   }
   ```

7. **Configura el Módulo:**
   ```typescript
   @Module({
     imports: [CqrsModule],
     controllers: [ProductsController],
     providers: [
       {
         provide: ProductRepository,
         useClass: InMemoryProductRepository,
       },
       CreateProductCommandHandler,
     ],
     exports: [ProductRepository],
   })
   export class ProductsModule {}
   ```

---

### Receta B: Conectar a un Servicio Externo por URL Directa

1. **Crea el Puerto Abstracto:**
   ```typescript
   export abstract class CurrencyExchangePort {
     abstract getUsdRate(): Promise<number>;
   }
   ```

2. **Crea el Adaptador con `DirectHttpClientService`:**
   ```typescript
   import { Injectable } from '@nestjs/common';
   import { DirectHttpClientService } from '@shared/infrastructure';
   import { CurrencyExchangePort } from './currency-exchange.port';

   @Injectable()
   export class DirectCurrencyExchangeAdapter implements CurrencyExchangePort {
     constructor(private readonly http: DirectHttpClientService) {}

     async getUsdRate(): Promise<number> {
       const response = await this.http.get<{ rate: number }>(
         'https://api.exchangerate.internal/v1/usd'
       );
       return response.data.rate;
     }
   }
   ```

3. **Registra en el Módulo:**
   ```typescript
   {
     provide: CurrencyExchangePort,
     useClass: DirectCurrencyExchangeAdapter,
   }
   ```

---

### Receta C: Conectar a un Servicio Corporativo tras API Manager con OAuth2

1. **Crea el Puerto Abstracto:**
   ```typescript
   export abstract class EnterprisePartnerPort {
     abstract checkCreditScore(taxId: string): Promise<{ score: number }>;
   }
   ```

2. **Crea el Adaptador con `ApiManagerHttpClientService`:**
   ```typescript
   import { Injectable } from '@nestjs/common';
   import { ApiManagerHttpClientService, ApiManagerConfig } from '@shared/infrastructure';
   import { EnterprisePartnerPort } from './enterprise-partner.port';

   @Injectable()
   export class ApiManagerPartnerAdapter implements EnterprisePartnerPort {
     private readonly config: ApiManagerConfig = {
       baseUrl: process.env['PARTNER_APIM_URL'] || 'https://apim.corp.com/partner/v2',
       subscriptionKey: process.env['PARTNER_APIM_KEY'],
       subscriptionHeaderName: 'Ocp-Apim-Subscription-Key',
       oauth2: {
         tokenUrl: process.env['AUTH_TOKEN_URL'] || 'https://auth.corp.com/oauth/token',
         clientId: process.env['AUTH_CLIENT_ID'] || 'my-client-id',
         clientSecret: process.env['AUTH_CLIENT_SECRET'] || 'my-client-secret',
         scope: 'partner:read',
       },
     };

     constructor(private readonly apimClient: ApiManagerHttpClientService) {}

     async checkCreditScore(taxId: string): Promise<{ score: number }> {
       const res = await this.apimClient.get<{ score: number }>(
         `/credit-evaluation/${taxId}`,
         this.config
       );
       return res.data;
     }
   }
   ```

---

## 3. Guía de Pruebas Unitarias

Para testear cualquier Handler o Adapter de forma pura sin base de datos ni red:
```typescript
describe('MyHandler', () => {
  it('should return Result.ok when input is valid', async () => {
    const mockRepo = {
      findBySku: jest.fn().mockResolvedValue(null),
      save: jest.fn().mockResolvedValue(undefined),
    };
    const mockPublisher = {
      mergeObjectContext: jest.fn().mockReturnValue({ commit: jest.fn() }),
    };

    const handler = new CreateProductCommandHandler(mockRepo as any, mockPublisher as any);
    const result = await handler.execute(new CreateProductCommand('SKU123', 'Item', 100));

    expect(result.isSuccess).toBe(true);
    expect(result.value.sku).toBe('SKU123');
  });
});
```

---

## 4. Checklist para Pull Requests

- [ ] ¿El nuevo puerto utiliza `abstract class` en lugar de una interfaz?
- [ ] ¿Los errores de negocio retornan `Result.fail(DomainError)` y no lanzan excepciones?
- [ ] ¿Los servicios son `Singleton` y no utilizan `Scope.REQUEST`?
- [ ] ¿Los comandos definen su esquema Zod correspondiente?
- [ ] ¿Las llamadas externas usan `DirectHttpClientService` o `ApiManagerHttpClientService`?
- [ ] ¿Los tests unitarios cubren el caso exitoso (200/201) y el caso fallido de negocio (409/422/404)?
- [ ] `npm test` y `npm run build` pasan al 100% sin advertencias.

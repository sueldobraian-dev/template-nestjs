---
name: nestjs-cqrs-template
description: >-
  Guía experta y generador de arquitectura para el template empresarial NestJS + Nx con CQRS,
  Pipeline Behaviors (estilo MediatR), Result Pattern, AsyncLocalStorage y puertos/adaptadores
  para bases de datos, APIs de URL directa y APIs corporativas tras API Managers con OAuth2.
---

# Skill: Adopción y Extensión de template-nestjs

Esta skill capacita a los agentes y desarrolladores en **Anti-Gravity** para extender y adoptar este template de NestJS respetando rigurosamente sus estándares de ingeniería y arquitectura limpia.

---

## 1. Principios y Reglas de Arquitectura

Al generar o modificar código en este repositorio, debes cumplir **estrictamente** con estas reglas:

1. **Inyección de Dependencias Limpia:**
   - Todo puerto de salida (repositorio, cliente HTTP, servicio externo) DEBE ser una `abstract class` y NUNCA una `interface`.
   - Ejemplo:
     ```typescript
     export abstract class OrderRepository {
       abstract findById(id: string): Promise<OrderAggregate | null>;
       abstract save(order: OrderAggregate): Promise<void>;
     }
     ```
2. **Cero `Scope.REQUEST` (Solo Singletons):**
   - Todos los servicios deben ser Singletons (`Scope.DEFAULT`).
   - El contexto de solicitud (`correlationId`, tokens, usuario) se lee de `RequestContextService` respaldado por `AsyncLocalStorage`.
3. **Result Pattern Funcional:**
   - Nunca uses `throw` para reglas de negocio esperadas. Retorna siempre `Result.ok(data)` o `Result.fail(new DomainError(...))`.
   - El `ResponseEnvelopeInterceptor` mapea automáticamente los resultados a códigos HTTP (200, 201, 404, 409, 422).
4. **Pipeline Behaviors:**
   - La validación Zod y el logging estructurado con sanitización de contraseñas se ejecutan automáticamente a través de `PipelineCommandBus`.
5. **Servicios Externos (Hexagonal Outbound):**
   - **URL Directa:** Se implementa con `DirectHttpClientService` (adjunta `x-correlation-id` automáticamente).
   - **API Gateway con OAuth2:** Se implementa con `ApiManagerHttpClientService` + `OAuth2TokenService` (maneja cache de tokens con expiración y cabeceras de suscripción).

---

## 2. Procedimiento para Generar una Nueva Funcionalidad (Vertical Slice)

Cuando el usuario pida agregar una entidad o feature (ej. `orders`, `invoices`, `notifications`):

### Paso 1: Definir el Agregado de Dominio
Crea `apps/api/src/app/<feature>/domain/<feature>.aggregate.ts`:
- Extiende `AggregateRoot` de `@nestjs/cqrs`.
- Encapsula invariants y emite eventos con `this.apply(new <Feature>CreatedEvent(...))`.

### Paso 2: Definir los Puertos de Salida (Abstract Classes)
- Para base de datos: `apps/api/src/app/<feature>/domain/<feature>.repository.port.ts`.
- Para servicios externos HTTP: `apps/api/src/app/<feature>/domain/ports/<service>.port.ts`.

### Paso 3: Crear los Adaptadores de Infraestructura
- Adaptador de base de datos en `apps/api/src/app/<feature>/infrastructure/`.
- Adaptador de servicio externo en `apps/api/src/app/<feature>/infrastructure/adapters/`:
  - Si es URL directa: inyecta `DirectHttpClientService`.
  - Si es API Manager con OAuth2: inyecta `ApiManagerHttpClientService` y define su `ApiManagerConfig`.

### Paso 4: Definir el Comando con Schema Zod
Crea `apps/api/src/app/<feature>/application/commands/<action>-<feature>.command.ts`:
```typescript
import { ICommand } from '@nestjs/cqrs';
import { z } from 'zod';
import { ValidatableCommand } from '@shared/cqrs-pipeline';

export class CreateOrderCommand implements ValidatableCommand, ICommand {
  public static readonly schema = z.object({
    customerId: z.string().uuid(),
    amount: z.number().positive(),
  });

  public readonly schema = CreateOrderCommand.schema;

  constructor(public readonly customerId: string, public readonly amount: number) {}
}
```

### Paso 5: Implementar el Command Handler
Crea `apps/api/src/app/<feature>/application/commands/<action>-<feature>.handler.ts`:
- Implementa `ICommandHandler<<Command>, Result<<Aggregate>, DomainError>>`.
- Inyecta el puerto del repositorio (`abstract class`) y `EventPublisher`.
- Retorna `Result.fail(...)` en caso de fallo de negocio o `Result.ok(...)` tras persistir y llamar a `commit()`.

### Paso 6: Crear el Controlador HTTP
Crea `apps/api/src/app/<feature>/presentation/<feature>.controller.ts`:
- Inyecta `PipelineCommandBus`.
- Invoca `this.commandBus.execute(command)`.
- El `ResponseEnvelopeInterceptor` se encarga del desempaquetado de la respuesta.

### Paso 7: Configurar el Módulo
Crea `apps/api/src/app/<feature>/<feature>.module.ts`:
- Enlaza cada puerto abstracto con su adaptador concreto:
  ```typescript
  { provide: OrderRepository, useClass: InMemoryOrderRepository },
  { provide: PaymentGatewayPort, useClass: ApiManagerPaymentGatewayAdapter }
  ```

---

## 3. Comandos de Verificación

Tras generar o modificar código:
1. Compilar todo el workspace:
   ```bash
   npx nx run-many -t build
   ```
2. Correr los tests unitarios en Jest:
   ```bash
   npx nx run-many -t test
   ```
3. Ejecutar la API en modo de desarrollo:
   ```bash
   npm run start:dev
   ```

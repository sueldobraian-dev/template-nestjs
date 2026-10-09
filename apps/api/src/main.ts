import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { apiReference } from '@scalar/nestjs-api-reference';
import { AppModule } from './app/app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const globalPrefix = 'api';
  app.setGlobalPrefix(globalPrefix);

  // 1. Configuración del documento OpenAPI con Soporte Bearer JWT
  const config = new DocumentBuilder()
    .setTitle('Template NestJS Enterprise API')
    .setDescription(
      'Documentación interactiva de la API con Swagger CLI Plugin e interfaz Scalar.'
    )
    .setVersion('1.0.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Authorization',
        description: 'Ingresa tu Token JWT en el formato: Bearer <token>',
        in: 'header',
      },
      'bearer' // Nombre identificador del esquema Bearer JWT
    )
    .build();

  // 2. Introspección y generación del documento OpenAPI
  const document = SwaggerModule.createDocument(app, config);

  // 3. Conexión directa del JSON OpenAPI a la interfaz moderna de Scalar en '/docs'
  app.use(
    '/docs',
    apiReference({
      spec: {
        content: document,
      },
      theme: 'purple',
    })
  );

  const port = process.env['PORT'] || 3000;
  await app.listen(port);

  Logger.log(
    `🚀 Aplicación ejecutándose en: http://localhost:${port}/${globalPrefix}`
  );
  Logger.log(
    `📖 Documentación Scalar lista en: http://localhost:${port}/docs`
  );
}

bootstrap();

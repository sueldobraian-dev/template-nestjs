import { Injectable, Logger } from '@nestjs/common';
import { DirectHttpClientService } from '@shared/infrastructure';
import { NotificationServicePort } from '../../domain/ports/notification-service.port';

@Injectable()
export class DirectNotificationAdapter implements NotificationServicePort {
  private readonly logger = new Logger(DirectNotificationAdapter.name);
  private readonly endpointUrl: string;

  constructor(private readonly httpClient: DirectHttpClientService) {
    this.endpointUrl =
      process.env['NOTIFICATION_SERVICE_URL'] ||
      'https://notifications.internal.corp/api/v1/send-email';
  }

  async sendWelcomeEmail(email: string, name: string): Promise<void> {
    this.logger.log(
      `Enviando email de bienvenida vía DirectHttpClient a '${this.endpointUrl}' para destinatario '${email}'`
    );

    // En ambiente de desarrollo o test, simula o envía la petición HTTP directa
    if (process.env['NODE_ENV'] !== 'test') {
      try {
        await this.httpClient.post(this.endpointUrl, {
          to: email,
          template: 'WELCOME_USER',
          variables: { name },
        });
      } catch (error) {
        this.logger.warn(
          `Servicio externo de notificación no disponible: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }
  }
}

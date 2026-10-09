export abstract class NotificationServicePort {
  abstract sendWelcomeEmail(email: string, name: string): Promise<void>;
}

import { BadRequestException, Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

/**
 * Middleware de regla de arquitectura: Prohíbe el versionado por path o extensión de dominio (ej. /v1/users).
 * Obliga el uso exclusivo de versionado por Query String (?api-version=X).
 */
@Injectable()
export class DisallowPathVersioningMiddleware implements NestMiddleware {
  use(req: Request, _res: Response, next: NextFunction): void {
    const path = req.path || req.originalUrl;

    // Detecta prefijos de versión en el path como /v1/, /v2/, /version1/, /v1.0/
    const pathVersioningRegex = /\/(v\d+(\.\d+)?|version\d+)(\/|$)/i;

    if (pathVersioningRegex.test(path)) {
      throw new BadRequestException({
        code: 'PATH_VERSIONING_NOT_ALLOWED',
        message:
          "El versionado por path o extensión de dominio (ej. /v1/users) está prohibido en este template. La API utiliza exclusivamente versionado por Query String mediante el parámetro '?api-version=X' (ejemplo: /api/users?api-version=1).",
      });
    }

    next();
  }
}

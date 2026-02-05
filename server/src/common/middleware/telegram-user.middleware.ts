import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { TelegramAuthService } from '../../auth/telegram-auth.service';

@Injectable()
export class TelegramUserMiddleware implements NestMiddleware {
  constructor(private telegramAuthService: TelegramAuthService) {}

  use(req: Request, res: Response, next: NextFunction) {
    if (req.telegramUser) {
      return next();
    }

    const initData = req.headers['x-telegram-init-data'] as string || req.body?.initData;

    if (!initData) {
      return next();
    }

    const telegramUser = this.telegramAuthService.validateInitData(initData);
    
    if (telegramUser) {
      req.telegramUser = telegramUser;
    }

    next();
  }
}

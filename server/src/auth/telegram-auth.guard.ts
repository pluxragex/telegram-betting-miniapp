import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { TelegramAuthService } from './telegram-auth.service';

@Injectable()
export class TelegramAuthGuard implements CanActivate {
  constructor(private telegramAuthService: TelegramAuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const initData = request.headers['x-telegram-init-data'] || request.body?.initData;

    if (!initData) {
      throw new UnauthorizedException('Telegram initData is required');
    }

    const user = this.telegramAuthService.validateInitData(initData);
    if (!user) {
      throw new UnauthorizedException('Invalid Telegram initData');
    }

    request.telegramUser = user;
    return true;
  }
}


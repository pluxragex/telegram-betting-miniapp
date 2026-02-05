import { ExecutionContext, Injectable } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerException } from '@nestjs/throttler';

@Injectable()
export class TelegramThrottlerGuard extends ThrottlerGuard {
  async getTracker(req: Record<string, any>): Promise<string> {
    const telegramUser = req.telegramUser;
    if (telegramUser && telegramUser.id) {
      return `telegram:${telegramUser.id}`;
    }

    const ip = req.ip || req.connection?.remoteAddress || req.socket?.remoteAddress || 'unknown';
    return `ip:${ip}`;
  }

  async throwThrottlingException(context: ExecutionContext): Promise<void> {
    throw new ThrottlerException('Too Many Requests');
  }
}

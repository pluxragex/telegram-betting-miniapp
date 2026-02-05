import { Controller, Post, Body } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { TelegramAuthService } from './telegram-auth.service';
import { UsersService } from '../modules/users/users.service';

@Controller('auth')
export class AuthController {
  constructor(
    private telegramAuthService: TelegramAuthService,
    private usersService: UsersService,
  ) {}

  @Post('telegram')
  @Throttle({ default: { ttl: 60_000, limit: 60 } })
  async authTelegram(@Body() body: { initData: string }) {
    const user = this.telegramAuthService.validateInitData(body.initData);
    if (!user) {
      throw new Error('Invalid Telegram initData');
    }

    const dbUser = await this.usersService.findOrCreate(
      user.id,
      user.username,
    );

    return {
      success: true,
      user: {
        id: dbUser.id,
        telegram_id: dbUser.telegram_id,
        username: dbUser.username,
        participation: dbUser.participation,
        balance: dbUser.balance,
      },
    };
  }
}


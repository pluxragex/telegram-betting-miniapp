import { Module, forwardRef } from '@nestjs/common';
import { TelegramAuthService } from './telegram-auth.service';
import { TelegramAuthGuard } from './telegram-auth.guard';
import { AuthController } from './auth.controller';
import { UsersModule } from '../modules/users/users.module';

@Module({
  imports: [forwardRef(() => UsersModule)],
  controllers: [AuthController],
  providers: [TelegramAuthService, TelegramAuthGuard],
  exports: [TelegramAuthService, TelegramAuthGuard],
})
export class AuthModule {}


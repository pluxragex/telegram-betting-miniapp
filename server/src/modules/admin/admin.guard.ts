import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';

@Injectable()
export class AdminGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const telegramUser = request.telegramUser;

    if (!telegramUser) {
      throw new ForbiddenException('User not authenticated');
    }

    const adminIds = process.env.ADMIN_TELEGRAM_IDS || '';
    if (!adminIds) {
      throw new ForbiddenException('Admin access required');
    }

    const adminIdsList = adminIds.split(',').map(id => id.trim());
    const isAdmin = adminIdsList.includes(telegramUser.id);

    if (!isAdmin) {
      throw new ForbiddenException('Admin access required');
    }

    return true;
  }
}


import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { BonusCodesService } from './bonus-codes.service';
import { TelegramAuthGuard } from '../../auth/telegram-auth.guard';
import { AdminGuard } from '../admin/admin.guard';
import { TelegramUser } from '../../common/decorators/telegram-user.decorator';
import { UsersService } from '../users/users.service';

@Controller('admin/bonus-codes')
@UseGuards(TelegramAuthGuard, AdminGuard)
export class BonusCodesController {
  constructor(private readonly bonusCodesService: BonusCodesService) {}

  @Post('generate')
  @Throttle({ default: { ttl: 60_000, limit: 60 } })
  async generateCodes(
    @Body()
    body: {
      count: number;
      value: number;
      codeLength: number;
      maxUses: number | null;
    },
  ) {
    return this.bonusCodesService.generateCodes(
      body.count,
      body.value,
      body.codeLength,
      body.maxUses,
    );
  }

  @Get()
  @Throttle({ default: { ttl: 60_000, limit: 120 } })
  async findAll(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '50',
  ) {
    return this.bonusCodesService.findAll(+page, +limit);
  }

  @Get(':id/statistics')
  @Throttle({ default: { ttl: 60_000, limit: 120 } })
  async getStatistics(@Param('id') id: string) {
    return this.bonusCodesService.getStatistics(+id);
  }

  @Delete(':id')
  @Throttle({ default: { ttl: 60_000, limit: 60 } })
  async deleteCode(@Param('id') id: string) {
    await this.bonusCodesService.deleteCode(+id);
    return { success: true };
  }
}

@Controller('bonus-codes')
@UseGuards(TelegramAuthGuard)
export class BonusCodesPublicController {
  constructor(
    private readonly bonusCodesService: BonusCodesService,
    private readonly usersService: UsersService,
  ) {}

  @Post('redeem')
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  async redeemCode(
    @Body() body: { code: string },
    @TelegramUser() telegramUser: any,
  ) {
    if (!body.code || typeof body.code !== 'string' || body.code.trim().length === 0) {
      throw new BadRequestException('Код не может быть пустым');
    }
    
    const user = await this.usersService.findOrCreate(telegramUser.id, telegramUser.username);
    
    return this.bonusCodesService.redeemCode(user.id, body.code.trim());
  }
}

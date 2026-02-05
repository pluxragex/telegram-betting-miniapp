import { Injectable, OnModuleInit, Logger } from '@nestjs/common';

@Injectable()
export class BotService implements OnModuleInit {
  private bot: any;
  private readonly logger = new Logger(BotService.name);

  private formatMatchStartRu(date: Date): string {
    const formatter = new Intl.DateTimeFormat('ru-RU', {
      timeZone: 'Europe/Moscow',
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });

    const parts = formatter.formatToParts(date);
    const day = parts.find((p) => p.type === 'day')?.value || '';
    const month = parts.find((p) => p.type === 'month')?.value || '';
    const hour = parts.find((p) => p.type === 'hour')?.value || '';
    const minute = parts.find((p) => p.type === 'minute')?.value || '';

    return `${day} ${month}, ${hour}:${minute}`;
  }

  onModuleInit() {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const miniAppUrl = process.env.TELEGRAM_MINI_APP_URL || '';

    if (!botToken) {
      this.logger.warn('TELEGRAM_BOT_TOKEN не установлен, бот не будет запущен');
      return;
    }

    if (!miniAppUrl) {
      this.logger.warn('TELEGRAM_MINI_APP_URL не установлен. Убедитесь, что Mini App URL настроен через @BotFather');
    }

    try {
      const TelegramBot = require('node-telegram-bot-api');
      this.bot = new TelegramBot(botToken, { polling: true });

      this.bot.onText(/\/start/, (msg) => {
        const chatId = msg.chat.id;
        const welcomeMessage = 'Добро пожаловать! Откройте Mini App для участия.';

        const options: any = {
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: 'Открыть Mini App',
                  web_app: {
                    url: miniAppUrl,
                  },
                },
              ],
            ],
          },
        };

        this.bot.sendMessage(chatId, welcomeMessage, options);
      });

      this.logger.log('Telegram бот успешно запущен');
    } catch (error) {
      this.logger.error(`Ошибка при запуске бота: ${error.message}`);
    }
  }

  async postNewMatchToNewsChannel(payload: {
    team1Name: string;
    team2Name: string;
    startTime: Date;
    groupId: number;
  }): Promise<void> {
    const channelId = process.env.TELEGRAM_CHANNEL_NEWS_ID;
    const miniAppUrl = process.env.TELEGRAM_MINI_APP_URL || '';
    const botUsername = process.env.TELEGRAM_BOT_USERNAME || '';

    if (!channelId) {
      this.logger.warn('TELEGRAM_CHANNEL_NEWS_ID не установлен — пост о матче не будет отправлен');
      return;
    }
    if (!this.bot) {
      this.logger.warn('Telegram bot не инициализирован — пост о матче не будет отправлен');
      return;
    }

    const cleanChannelId = channelId.replace('@', '');
    const chatId = `@${cleanChannelId}`;

    const text =
      `Новый матч!\n\n` +
      `${payload.team1Name} vs ${payload.team2Name}\n` +
      `Начало: ${this.formatMatchStartRu(payload.startTime)}`;

    let deepLink = '';
    if (botUsername) {
      const cleanUsername = botUsername.replace('@', '');
      const startParam = `group_${payload.groupId}`;
      deepLink = `https://t.me/${cleanUsername}?startapp=${encodeURIComponent(startParam)}`;
    } else if (miniAppUrl) {
      deepLink = miniAppUrl;
    }

    const options: any = deepLink
      ? {
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: 'Сделать ставку',
                  url: deepLink,
                },
              ],
            ],
          },
        }
      : undefined;

    try {
      await this.bot.sendMessage(chatId, text, options);
    } catch (error: any) {
      this.logger.error(`Ошибка отправки поста в TELEGRAM_CHANNEL_NEWS_ID: ${error?.message || error}`);
    }
  }
}

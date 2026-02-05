import { Injectable, UnauthorizedException } from '@nestjs/common';
import * as crypto from 'crypto';

export interface TelegramUser {
  id: string;
  first_name?: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
}

@Injectable()
export class TelegramAuthService {
  private readonly BOT_TOKEN: string;

  constructor() {
    this.BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
    if (!this.BOT_TOKEN) {
      throw new Error('TELEGRAM_BOT_TOKEN is required');
    }
  }

  async checkChannelSubscription(userId: string): Promise<boolean> {
    const channelId = process.env.TELEGRAM_CHANNEL_ID;
    if (!channelId) {
      return true;
    }

    try {
      const cleanChannelId = channelId.replace('@', '');
      const chatId = `@${cleanChannelId}`;
      const apiUrl = `https://api.telegram.org/bot${this.BOT_TOKEN}/getChatMember?chat_id=${encodeURIComponent(chatId)}&user_id=${userId}`;
      
      const response = await fetch(apiUrl);
      const data = await response.json();

      if (!data.ok) {
        if (data.error_code === 400 && data.description?.includes('chat not found')) {
          console.error('Telegram API error: Chat not found. Make sure bot is admin of the channel');
        } else {
          console.error('Telegram API error:', data.description);
        }
        return false;
      }

      const status = data.result?.status;
      return ['member', 'administrator', 'creator', 'restricted'].includes(status);
    } catch (error) {
      console.error('Error checking channel subscription:', error);
      return false;
    }
  }

  validateInitData(initData: string): TelegramUser | null {
    try {
      const urlParams = new URLSearchParams(initData);
      const hash = urlParams.get('hash');
      const authDate = urlParams.get('auth_date');

      if (!hash || !authDate) {
        return null;
      }

      const authDateNum = parseInt(authDate, 10);
      const currentTime = Math.floor(Date.now() / 1000);
      if (currentTime - authDateNum > 86400) {
        return null;
      }

      urlParams.delete('hash');

      const sortedParams = Array.from(urlParams.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, value]) => `${key}=${value}`)
        .join('\n');

      const secretKey = crypto
        .createHmac('sha256', 'WebAppData')
        .update(this.BOT_TOKEN)
        .digest();

      const calculatedHash = crypto
        .createHmac('sha256', secretKey)
        .update(sortedParams)
        .digest('hex');

      if (calculatedHash !== hash) {
        return null;
      }

      const userStr = urlParams.get('user');
      if (!userStr) {
        return null;
      }

      const user = JSON.parse(userStr);
      return {
        id: user.id.toString(),
        first_name: user.first_name,
        last_name: user.last_name,
        username: user.username,
        photo_url: user.photo_url,
        auth_date: authDateNum,
        hash,
      };
    } catch (error) {
      return null;
    }
  }
}


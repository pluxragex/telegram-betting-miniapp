import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { PrizesService } from './prizes.service';
import { TelegramAuthGuard } from '../../auth/telegram-auth.guard';
import { AdminGuard } from '../admin/admin.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import * as sharp from 'sharp';

@Controller('admin/prizes')
@UseGuards(TelegramAuthGuard, AdminGuard)
export class PrizesController {
  constructor(private readonly prizesService: PrizesService) {}

  @Get()
  async findAll() {
    return this.prizesService.findAll();
  }

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('image', {
      limits: { fileSize: 2 * 1024 * 1024 }, 
    }),
  )
  async uploadImage(@UploadedFile() file: any) {
    if (!file) {
      throw new BadRequestException('Файл изображения не получен');
    }

    if (file.mimetype !== 'image/png') {
      throw new BadRequestException('Допустим только PNG формат изображения');
    }

    try {
      const processedBuffer = await sharp(file.buffer)
        .resize(400, 400, { fit: 'inside', withoutEnlargement: true })
        .png({ quality: 80, compressionLevel: 9 })
        .toBuffer();

      const base64 = processedBuffer.toString('base64');
      const dataUrl = `data:image/png;base64,${base64}`;

      return { imageData: dataUrl };
    } catch (error) {
      throw new BadRequestException('Не удалось обработать изображение');
    }
  }

  @Post()
  async create(@Body() body: { position: number; image_url: string }) {
    return this.prizesService.create(body);
  }

  @Get('settings')
  async getSettings() {
    const rankingLimit = await this.prizesService.getRankingLimit();
    return { rankingLimit };
  }

  @Put('settings')
  async updateSettings(@Body() body: { rankingLimit: number | string }) {
    const parsedLimit = Number(body.rankingLimit);

    if (
      typeof parsedLimit !== 'number' ||
      !Number.isFinite(parsedLimit) ||
      parsedLimit <= 0
    ) {
      throw new BadRequestException('Некорректное значение лимита рейтинга');
    }

    const normalizedLimit = parsedLimit > 1000 ? 1000 : Math.floor(parsedLimit);

    await this.prizesService.setRankingLimit(normalizedLimit);
    return { rankingLimit: normalizedLimit };
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() body: { position?: number; image_url?: string },
  ) {
    return this.prizesService.update(+id, body);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    await this.prizesService.delete(+id);
    return { success: true };
  }
}

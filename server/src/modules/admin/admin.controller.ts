import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AdminService } from './admin.service';
import { TelegramAuthGuard } from '../../auth/telegram-auth.guard';
import { AdminGuard } from './admin.guard';
import { MatchResult } from '../../database/entities';
import { FileInterceptor } from '@nestjs/platform-express';
import * as sharp from 'sharp';

@Controller('admin')
@UseGuards(TelegramAuthGuard, AdminGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('groups')
  @Throttle({ default: { ttl: 60_000, limit: 120 } })
  async getGroups() {
    return this.adminService.getGroups();
  }

  @Post('groups')
  @Throttle({ default: { ttl: 60_000, limit: 60 } })
  async createGroup(@Body() body: { name: string }) {
    return this.adminService.createGroup(body.name);
  }

  @Put('groups/:id')
  async updateGroup(@Param('id') id: string, @Body() body: { name: string }) {
    return this.adminService.updateGroup(+id, body.name);
  }

  @Delete('groups/:id')
  @Throttle({ default: { ttl: 60_000, limit: 60 } })
  async deleteGroup(@Param('id') id: string) {
    await this.adminService.deleteGroup(+id);
    return { success: true };
  }

  @Get('teams')
  @Throttle({ default: { ttl: 60_000, limit: 180 } })
  async getTeams(@Query('group_id') groupId?: string) {
    if (groupId) {
      return this.adminService.getTeamsByGroup(+groupId);
    }
    return this.adminService.getAllTeams();
  }

  @Post('teams')
  @Throttle({ default: { ttl: 60_000, limit: 60 } })
  async createTeam(
    @Body() body: { name: string; group_id: number; logo_url?: string | null },
  ) {
    return this.adminService.createTeam(body.name, body.group_id, body.logo_url);
  }

  @Post('teams/upload')
  @Throttle({ default: { ttl: 60_000, limit: 60 } })
  @UseInterceptors(
    FileInterceptor('image', {
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  async uploadTeamLogo(@UploadedFile() file: any) {
    if (!file) {
      throw new BadRequestException('Файл изображения не получен');
    }

    if (file.mimetype !== 'image/png') {
      throw new BadRequestException('Допустим только PNG формат изображения');
    }

    try {
      const processedBuffer = await sharp(file.buffer)
        .resize(512, 512, { fit: 'inside', withoutEnlargement: true })
        .png({ quality: 80, compressionLevel: 9 })
        .toBuffer();

      const base64 = processedBuffer.toString('base64');
      const dataUrl = `data:image/png;base64,${base64}`;

      return { imageData: dataUrl };
    } catch (error) {
      throw new BadRequestException('Не удалось обработать изображение');
    }
  }

  @Put('teams/:id')
  @Throttle({ default: { ttl: 60_000, limit: 60 } })
  async updateTeam(
    @Param('id') id: string,
    @Body() body: { name?: string; logo_url?: string | null },
  ) {
    return this.adminService.updateTeam(+id, body);
  }

  @Delete('teams/:id')
  @Throttle({ default: { ttl: 60_000, limit: 60 } })
  async deleteTeam(@Param('id') id: string) {
    await this.adminService.deleteTeam(+id);
    return { success: true };
  }

  @Get('matches')
  @Throttle({ default: { ttl: 60_000, limit: 180 } })
  async getMatches(@Query('group_id') groupId?: string) {
    if (groupId) {
      return this.adminService.getMatchesByGroup(+groupId);
    }
    return this.adminService.getAllMatches();
  }

  @Post('matches')
  @Throttle({ default: { ttl: 60_000, limit: 60 } })
  async createMatch(
    @Body()
    body: {
      team1_id: number;
      team2_id: number;
      group_id: number;
      start_time: string;
    },
  ) {
    return this.adminService.createMatch({
      team1_id: body.team1_id,
      team2_id: body.team2_id,
      group_id: body.group_id,
      start_time: new Date(body.start_time),
    });
  }

  @Put('matches/:id/result')
  @Throttle({ default: { ttl: 60_000, limit: 60 } })
  async setMatchResult(
    @Param('id') id: string,
    @Body() body: { result: MatchResult },
  ) {
    await this.adminService.setMatchResult(+id, body.result);
    return { success: true };
  }

  @Delete('matches/:id')
  async deleteMatch(@Param('id') id: string) {
    await this.adminService.deleteMatch(+id);
    return { success: true };
  }

  @Get('matches/archive')
  @Throttle({ default: { ttl: 60_000, limit: 120 } })
  async getFinishedMatches(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('search') search?: string,
  ) {
    return this.adminService.getFinishedMatches(+page, +limit, search);
  }

  @Post('matches/:id/refund')
  @Throttle({ default: { ttl: 60_000, limit: 60 } })
  async refundMatch(@Param('id') id: string) {
    return this.adminService.refundMatch(+id);
  }

  @Get('users')
  @Throttle({ default: { ttl: 60_000, limit: 120 } })
  async getUsers(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
    @Query('search') search?: string,
  ) {
    return this.adminService.getUsers(+page, +limit, search);
  }

  @Post('users/:id/balance')
  @Throttle({ default: { ttl: 60_000, limit: 60 } })
  async updateUserBalance(
    @Param('id') id: string,
    @Body() body: { amount: number },
  ) {
    return this.adminService.updateUserBalance(+id, body.amount);
  }

  @Delete('users/:id/display-name')
  @Throttle({ default: { ttl: 60_000, limit: 60 } })
  async resetUserDisplayName(@Param('id') id: string) {
    await this.adminService.resetUserDisplayName(+id);
    return { success: true };
  }
}


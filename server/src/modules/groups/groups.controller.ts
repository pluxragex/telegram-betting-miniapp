import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { GroupsService } from './groups.service';
import { TelegramAuthGuard } from '../../auth/telegram-auth.guard';

@Controller('groups')
export class GroupsController {
  constructor(private readonly groupsService: GroupsService) {}

  @Get()
  @UseGuards(TelegramAuthGuard)
  async findAll() {
    const groups = await this.groupsService.findAll();
    return groups;
  }

  @Get(':id')
  @UseGuards(TelegramAuthGuard)
  async findOne(@Param('id') id: string) {
    return this.groupsService.findById(+id);
  }
}


import { Injectable, BadRequestException } from '@nestjs/common';
import { GroupsService } from '../groups/groups.service';
import { TeamsService } from '../teams/teams.service';
import { MatchesService } from '../matches/matches.service';
import { UsersService } from '../users/users.service';
import { MatchResult } from '../../database/entities';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { BotService } from '../bot/bot.service';

@Injectable()
export class AdminService {
  constructor(
    private groupsService: GroupsService,
    private teamsService: TeamsService,
    private matchesService: MatchesService,
    private usersService: UsersService,
    private realtimeGateway: RealtimeGateway,
    private botService: BotService,
  ) {}

  async getGroups() {
    return this.groupsService.findAll();
  }

  async createGroup(name: string) {
    return this.groupsService.create(name);
  }

  async updateGroup(id: number, name: string) {
    return this.groupsService.update(id, name);
  }

  async deleteGroup(id: number) {
    const hasActiveMatches = await this.matchesService.hasActiveMatchesByGroupId(id);
    if (hasActiveMatches) {
      throw new BadRequestException(
        'Нельзя удалить группу с активными матчами. Сначала завершите эти матчи.',
      );
    }
    await this.groupsService.delete(id);
  }

  async getAllTeams() {
    return [];
  }

  async getTeamsByGroup(groupId: number) {
    return this.teamsService.findByGroupId(groupId);
  }

  async createTeam(name: string, groupId: number, logo_url?: string | null) {
    const team = await this.teamsService.create(name, groupId);
    if (logo_url !== undefined) {
      return this.teamsService.update(team.id, { logo_url });
    }
    return team;
  }

  async updateTeam(id: number, data: { name?: string; logo_url?: string | null }) {
    return this.teamsService.update(id, data);
  }

  async deleteTeam(id: number) {
    const hasActiveMatches = await this.matchesService.hasActiveMatchesByTeamId(id);
    if (hasActiveMatches) {
      throw new BadRequestException(
        'Нельзя удалить команду с активными матчами. Сначала завершите эти матчи.',
      );
    }
    await this.teamsService.delete(id);
  }

  async getAllMatches() {
    return [];
  }

  async getFinishedMatches(page: number, limit: number, search?: string) {
    return this.matchesService.findFinishedMatches(page, limit, search);
  }

  async getMatchesByGroup(groupId: number) {
    return this.matchesService.findByGroupId(groupId);
  }

  async createMatch(data: {
    team1_id: number;
    team2_id: number;
    group_id: number;
    start_time: Date;
  }) {
    if (!data.team1_id || !data.team2_id || data.team1_id === 0 || data.team2_id === 0) {
      throw new BadRequestException('Необходимо выбрать обе команды');
    }
    if (data.team1_id === data.team2_id) {
      throw new BadRequestException('Команды должны быть разными');
    }
    if (!data.group_id || data.group_id === 0) {
      throw new BadRequestException('Необходимо выбрать группу');
    }
    const match = await this.matchesService.create(data);
    this.realtimeGateway.emitMatchesUpdated(data.group_id);

    try {
      const created = await this.matchesService.findById(match.id);
      if (created?.team1?.name && created?.team2?.name) {
        await this.botService.postNewMatchToNewsChannel({
          team1Name: created.team1.name,
          team2Name: created.team2.name,
          startTime: created.start_time,
          groupId: created.group_id,
        });
      }
    } catch {
      // не блокируем создание матча из-за проблем с Telegram
    }

    return match;
  }

  async setMatchResult(matchId: number, result: MatchResult) {
    await this.matchesService.setResult(matchId, result);
  }

  async refundMatch(matchId: number) {
    return this.matchesService.refundMatch(matchId);
  }

  async deleteMatch(id: number) {
    await this.matchesService.delete(id);
    this.realtimeGateway.emitMatchesHistoryUpdated();
  }

  async getUsers(page: number, limit: number, search?: string) {
    return this.usersService.getUsersPaginated(page, limit, search);
  }

  async updateUserBalance(userId: number, amount: number) {
    const user = await this.usersService.updateBalance(userId, amount);
    this.realtimeGateway.emitRankingUpdated();
    this.realtimeGateway.emitUserBetsUpdated(userId);
    return user;
  }

  async resetUserDisplayName(userId: number) {
    await this.usersService.updateDisplayName(userId, null);
    this.realtimeGateway.emitRankingUpdated();
  }
}


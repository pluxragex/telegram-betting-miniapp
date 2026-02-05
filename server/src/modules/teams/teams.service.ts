import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Team } from '../../database/entities';
import { MatchesService } from '../matches/matches.service';

@Injectable()
export class TeamsService {
  constructor(
    @InjectRepository(Team)
    private teamsRepository: Repository<Team>,
    private matchesService: MatchesService,
  ) {}

  async findByGroupId(groupId: number): Promise<Team[]> {
    return this.teamsRepository.find({
      where: { group_id: groupId, is_active: true },
      order: { name: 'ASC' },
    });
  }

  async create(name: string, groupId: number): Promise<Team> {
    const team = this.teamsRepository.create({ name, group_id: groupId, logo_url: null });
    return this.teamsRepository.save(team);
  }

  async update(
    id: number,
    data: { name?: string; logo_url?: string | null },
  ): Promise<Team> {
    const team = await this.teamsRepository.findOne({ where: { id } });
    if (!team) {
      throw new Error('Team not found');
    }
    if (typeof data.name === 'string') {
      team.name = data.name;
    }
    if (data.logo_url !== undefined) {
      team.logo_url = data.logo_url;
    }
    return this.teamsRepository.save(team);
  }

  async delete(id: number): Promise<void> {
    await this.teamsRepository.update(id, { is_active: false });
  }
}


import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Group } from '../../database/entities';
import { MatchesService } from '../matches/matches.service';

@Injectable()
export class GroupsService {
  constructor(
    @InjectRepository(Group)
    private groupsRepository: Repository<Group>,
    private matchesService: MatchesService,
  ) {}

  async findAll(): Promise<Group[]> {
    return this.groupsRepository.find({
      where: { is_active: true },
      relations: ['teams'],
      order: { name: 'ASC' },
    });
  }

  async findById(id: number): Promise<Group> {
    return this.groupsRepository.findOne({
      where: { id },
      relations: ['teams', 'matches'],
    });
  }

  async create(name: string): Promise<Group> {
    const existing = await this.groupsRepository.findOne({
      where: { name },
    });

    if (existing && existing.is_active) {
      throw new Error('Group with this name already exists');
    }

    if (existing && !existing.is_active) {
      existing.is_active = true;
      return this.groupsRepository.save(existing);
    }

    const group = this.groupsRepository.create({ name });
    return this.groupsRepository.save(group);
  }

  async update(id: number, name: string): Promise<Group> {
    const group = await this.findById(id);
    if (!group) {
      throw new Error('Group not found');
    }
    group.name = name;
    return this.groupsRepository.save(group);
  }

  async delete(id: number): Promise<void> {
    await this.groupsRepository.update(id, { is_active: false });
  }
}


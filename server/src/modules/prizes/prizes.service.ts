import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Prize, RankingSettings } from '../../database/entities';

@Injectable()
export class PrizesService {
  constructor(
    @InjectRepository(Prize)
    private prizesRepository: Repository<Prize>,
    @InjectRepository(RankingSettings)
    private rankingSettingsRepository: Repository<RankingSettings>,
  ) {}

  async findAll(): Promise<Prize[]> {
    return this.prizesRepository.find({
      order: { position: 'ASC' },
    });
  }

  async findById(id: number): Promise<Prize> {
    return this.prizesRepository.findOne({ where: { id } });
  }

  async findByPosition(position: number): Promise<Prize | null> {
    return this.prizesRepository.findOne({ where: { position } });
  }

  async create(data: { position: number; image_url: string }): Promise<Prize> {
    const prize = this.prizesRepository.create(data);
    return this.prizesRepository.save(prize);
  }

  async update(id: number, data: { position?: number; image_url?: string }): Promise<Prize> {
    const prize = await this.findById(id);
    if (!prize) {
      throw new Error('Prize not found');
    }
    Object.assign(prize, data);
    return this.prizesRepository.save(prize);
  }

  async delete(id: number): Promise<void> {
    await this.prizesRepository.delete(id);
  }

  async count(): Promise<number> {
    return this.prizesRepository.count();
  }

  async getRankingLimit(): Promise<number> {
    const settings = await this.rankingSettingsRepository.find({
      take: 1,
      order: { id: 'ASC' },
    });

    if (!settings.length) {
      return 15;
    }

    let limit = settings[0].ranking_limit;

    if (typeof limit !== 'number' || !Number.isFinite(limit) || limit <= 0) {
      limit = 15;
      settings[0].ranking_limit = limit;
      await this.rankingSettingsRepository.save(settings[0]);
    }

    return limit;
  }

  async setRankingLimit(limit: number): Promise<RankingSettings> {
    const safeLimit = limit > 0 ? limit : 15;

    let settings = await this.rankingSettingsRepository.find({
      take: 1,
      order: { id: 'ASC' },
    });

    if (!settings.length) {
      const created = this.rankingSettingsRepository.create({
        ranking_limit: safeLimit,
      });
      return this.rankingSettingsRepository.save(created);
    }

    const current = settings[0];
    current.ranking_limit = safeLimit;
    return this.rankingSettingsRepository.save(current);
  }
}

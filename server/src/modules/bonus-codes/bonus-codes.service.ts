import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { BonusCode, BonusCodeUsage, User } from '../../database/entities';
import { UsersService } from '../users/users.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';

@Injectable()
export class BonusCodesService {
  constructor(
    @InjectRepository(BonusCode)
    private bonusCodesRepository: Repository<BonusCode>,
    @InjectRepository(BonusCodeUsage)
    private bonusCodeUsagesRepository: Repository<BonusCodeUsage>,
    private usersService: UsersService,
    @InjectDataSource()
    private dataSource: DataSource,
    private realtimeGateway: RealtimeGateway,
  ) {}

  private generateRandomCode(length: number): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  async generateCodes(
    count: number,
    value: number,
    codeLength: number,
    maxUses: number | null,
  ): Promise<BonusCode[]> {
    if (count <= 0 || count > 1000) {
      throw new BadRequestException('Количество кодов должно быть от 1 до 1000');
    }
    if (value <= 0) {
      throw new BadRequestException('Номинал должен быть больше 0');
    }
    if (codeLength < 4 || codeLength > 32) {
      throw new BadRequestException('Длина кода должна быть от 4 до 32 символов');
    }
    if (maxUses !== null && maxUses <= 0) {
      throw new BadRequestException('Максимальное количество использований должно быть больше 0');
    }

    const codes: BonusCode[] = [];
    const existingCodes = new Set<string>();

    const allCodes = await this.bonusCodesRepository.find({ select: ['code'] });
    allCodes.forEach((c) => existingCodes.add(c.code));

    for (let i = 0; i < count; i++) {
      let code: string;
      let attempts = 0;
      do {
        code = this.generateRandomCode(codeLength);
        attempts++;
        if (attempts > 100) {
          throw new BadRequestException('Не удалось сгенерировать уникальный код');
        }
      } while (existingCodes.has(code));

      existingCodes.add(code);

      const bonusCode = this.bonusCodesRepository.create({
        code,
        value,
        max_uses: maxUses,
        used_count: 0,
      });

      codes.push(bonusCode);
    }

    return this.bonusCodesRepository.save(codes);
  }

  async findAll(page: number = 1, limit: number = 50): Promise<{
    codes: BonusCode[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const [codes, total] = await this.bonusCodesRepository.findAndCount({
      order: { created_at: 'DESC' },
      take: limit,
      skip: (page - 1) * limit,
      relations: ['usages'],
    });

    return {
      codes,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getStatistics(codeId: number): Promise<{
    code: BonusCode;
    usages: Array<{
      id: number;
      user_id: number;
      user_telegram_id: string;
      user_username?: string;
      user_display_name?: string;
      used_at: Date;
    }>;
    total: number;
  }> {
    const code = await this.bonusCodesRepository.findOne({
      where: { id: codeId },
      relations: ['usages', 'usages.user'],
    });

    if (!code) {
      throw new NotFoundException('Бонус-код не найден');
    }

    const usages = await this.bonusCodeUsagesRepository.find({
      where: { bonus_code_id: codeId },
      relations: ['user'],
      order: { used_at: 'DESC' },
    });

    return {
      code,
      usages: usages.map((usage) => ({
        id: usage.id,
        user_id: usage.user_id,
        user_telegram_id: usage.user.telegram_id,
        user_username: usage.user.username || undefined,
        user_display_name: usage.user.display_name || undefined,
        used_at: usage.used_at,
      })),
      total: usages.length,
    };
  }

  async deleteCode(id: number): Promise<void> {
    const code = await this.bonusCodesRepository.findOne({ where: { id } });
    if (!code) {
      throw new NotFoundException('Бонус-код не найден');
    }
    await this.bonusCodesRepository.delete(id);
  }

  async redeemCode(userId: number, code: string): Promise<{ success: boolean; value: number }> {
    const normalizedCode = code.trim().toUpperCase();
    if (!normalizedCode || normalizedCode.length < 4) {
      throw new BadRequestException('Некорректный формат бонус-кода');
    }

    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new BadRequestException('Пользователь не найден');
    }

    const bonusCode = await this.bonusCodesRepository.findOne({
      where: { code: normalizedCode },
    });

    if (!bonusCode) {
      throw new BadRequestException('Бонус-код не найден');
    }

    const existingUsage = await this.bonusCodeUsagesRepository.findOne({
      where: {
        bonus_code_id: bonusCode.id,
        user_id: userId,
      },
    });

    if (existingUsage) {
      throw new BadRequestException('Вы уже использовали этот бонус-код');
    }

    if (bonusCode.max_uses !== null && bonusCode.used_count >= bonusCode.max_uses) {
      throw new BadRequestException('Бонус-код исчерпал лимит использований');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    
    await queryRunner.query('PRAGMA foreign_keys = ON');
    
    await queryRunner.startTransaction();

    const isSingleUse = bonusCode.max_uses === null;

    try {
      const codeExists = await queryRunner.query(
        'SELECT id FROM bonus_codes WHERE id = ?',
        [bonusCode.id]
      );
      if (!codeExists || codeExists.length === 0) {
        throw new BadRequestException('Бонус-код не найден');
      }

      await queryRunner.query(
        `INSERT INTO bonus_code_usages (bonus_code_id, user_id, used_at) VALUES (?, ?, datetime('now'))`,
        [bonusCode.id, userId]
      );

      await queryRunner.query(
        `UPDATE bonus_codes SET used_count = used_count + 1 WHERE id = ?`,
        [bonusCode.id]
      );

      await this.usersService.updateBalance(userId, bonusCode.value);

      await queryRunner.commitTransaction();

      if (isSingleUse) {
        const deleteRunner = this.dataSource.createQueryRunner();
        await deleteRunner.connect();
        await deleteRunner.query('PRAGMA foreign_keys = ON');
        
        try {
          await deleteRunner.query(
            'DELETE FROM bonus_code_usages WHERE bonus_code_id = ?',
            [bonusCode.id]
          );
          await deleteRunner.query(
            'DELETE FROM bonus_codes WHERE id = ?',
            [bonusCode.id]
          );
        } catch (deleteError) {
          console.error('Error deleting single-use bonus code:', deleteError);
        } finally {
          await deleteRunner.release();
        }
      }

      this.realtimeGateway.emitUserBetsUpdated(userId);
      this.realtimeGateway.emitRankingUpdated();

      return {
        success: true,
        value: bonusCode.value,
      };
    } catch (error: any) {
      await queryRunner.rollbackTransaction();
      
      if (error.message?.includes('FOREIGN KEY constraint failed')) {
        console.error('Foreign key constraint error:', {
          bonusCodeId: bonusCode.id,
          userId,
          error: error.message,
        });
        throw new BadRequestException('Ошибка при активации бонус-кода. Попробуйте позже.');
      }
      
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}

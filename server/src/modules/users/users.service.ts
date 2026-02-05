import { BadRequestException, Injectable, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { MoreThan, Repository, DataSource, In } from 'typeorm';
import { User } from '../../database/entities';
import { getMoscowTime } from '../../common/utils/timezone.util';
import { RealtimeGateway } from '../realtime/realtime.gateway';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectDataSource()
    private dataSource: DataSource,
    @Inject(forwardRef(() => RealtimeGateway))
    private realtimeGateway: RealtimeGateway,
  ) {}

  async findOrCreate(telegramId: string, username?: string): Promise<User> {
    let user = await this.usersRepository.findOne({
      where: { telegram_id: telegramId },
    });

    if (!user) {
      user = this.usersRepository.create({
        telegram_id: telegramId,
        username: username || null,
        participation: false,
        balance: 1000,
      });
      await this.usersRepository.save(user);
    } else if (username && user.username !== username) {
      user.username = username;
      await this.usersRepository.save(user);
    }

    return user;
  }

  async setParticipation(telegramId: string): Promise<User> {
    const user = await this.findOrCreate(telegramId);

    user.participation = true;
    return this.usersRepository.save(user);
  }

  async findById(id: number): Promise<User> {
    return this.usersRepository.findOne({ where: { id } });
  }

  async findByTelegramId(telegramId: string): Promise<User> {
    return this.usersRepository.findOne({ where: { telegram_id: telegramId } });
  }

  async updateBalance(userId: number, amount: number): Promise<User> {
    const user = await this.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const currentBalance = Number(user.balance);
    const delta = Number(amount);

    if (!Number.isFinite(currentBalance)) {
      throw new Error('Invalid user balance');
    }
    if (!Number.isFinite(delta)) {
      throw new Error('Invalid amount');
    }

    user.balance = currentBalance + delta;
    if (user.balance < 0) {
      throw new Error('Insufficient balance');
    }

    return this.usersRepository.save(user);
  }

  async updateBalancesBatch(updates: Array<{ userId: number; amount: number }>): Promise<void> {
    if (!updates || updates.length === 0) {
      return;
    }

    const userDeltas = new Map<number, number>();
    for (const update of updates) {
      const userId = update.userId;
      const amount = Number(update.amount);
      
      if (!Number.isFinite(amount)) {
        throw new Error(`Invalid amount for user ${userId}`);
      }

      const current = userDeltas.get(userId) || 0;
      userDeltas.set(userId, current + amount);
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const userIds = Array.from(userDeltas.keys());
      const users = await queryRunner.manager.find(User, {
        where: { id: In(userIds) },
        select: ['id', 'balance'],
      });

      const validUpdates: Array<{ userId: number; newBalance: number }> = [];
      const userBalanceMap = new Map(users.map(u => [u.id, Number(u.balance)]));

      for (const [userId, totalDelta] of userDeltas.entries()) {
        const currentBalance = userBalanceMap.get(userId);
        if (currentBalance === undefined) {
          throw new Error(`User ${userId} not found`);
        }

        const newBalance = currentBalance + totalDelta;
        if (!Number.isFinite(newBalance) || newBalance < 0) {
          throw new Error(`Insufficient balance for user ${userId}: balance would be ${newBalance}`);
        }

        validUpdates.push({ userId, newBalance });
      }

      for (const update of validUpdates) {
        await queryRunner.manager.update(
          User,
          { id: update.userId },
          { balance: update.newBalance },
        );
      }

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async getAllUsers(): Promise<User[]> {
    return this.usersRepository.find({
      order: { created_at: 'DESC' },
    });
  }

  async getUsersPaginated(
    page: number = 1,
    limit: number = 20,
    search?: string,
  ) {
    const safePage =
      typeof page === 'number' && Number.isFinite(page) && page > 0
        ? Math.floor(page)
        : 1;
    const safeLimit =
      typeof limit === 'number' && Number.isFinite(limit) && limit > 0
        ? Math.floor(limit)
        : 20;

    const qb = this.usersRepository.createQueryBuilder('user');

    if (search) {
      const term = `%${search}%`;
      qb.where(
        'LOWER(user.username) LIKE LOWER(:search) OR LOWER(user.display_name) LIKE LOWER(:search) OR LOWER(user.telegram_id) LIKE LOWER(:search)',
        { search: term },
      );
    }

    const skip = (safePage - 1) * safeLimit;
    const [users, total] = await qb
      .orderBy('user.created_at', 'DESC')
      .skip(skip)
      .take(safeLimit)
      .getManyAndCount();

    return {
      users,
      total,
      page: safePage,
      limit: safeLimit,
      totalPages: Math.ceil(total / safeLimit),
    };
  }

  async getTopUsers(limit: number = 15): Promise<User[]> {
    const safeLimit =
      typeof limit === 'number' && Number.isFinite(limit) && limit > 0
        ? Math.floor(limit)
        : 15;

    return this.usersRepository.find({
      order: { balance: 'DESC' },
      take: safeLimit,
    });
  }

  async getUserRank(userId: number): Promise<number | null> {
    const user = await this.findById(userId);
    if (!user) {
      return null;
    }

    const countHigher = await this.usersRepository.count({
      where: {
        balance: MoreThan(user.balance),
      },
    });

    return countHigher + 1;
  }

  async isAdmin(telegramId: string): Promise<boolean> {
    const adminIds = process.env.ADMIN_TELEGRAM_IDS || '';
    if (!adminIds) {
      return false;
    }
    
    const adminIdsList = adminIds.split(',').map(id => id.trim());
    return adminIdsList.includes(telegramId);
  }

  async updateDisplayName(userId: number, displayName: string | null): Promise<User> {
    const user = await this.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    if (displayName) {
      const cleanedName = displayName.replace(/\s/g, '').slice(0, 16);
      
      if (!cleanedName || cleanedName.length === 0) {
        throw new BadRequestException('Имя не может быть пустым или состоять только из пробелов');
      }

      if (!/[\p{L}\p{N}]/u.test(cleanedName)) {
        throw new BadRequestException('Имя должно содержать хотя бы одну букву или цифру');
      }

      const existing = await this.usersRepository
        .createQueryBuilder('user')
        .where('user.id != :userId', { userId })
        .andWhere('user.display_name IS NOT NULL')
        .andWhere('LOWER(user.display_name) = LOWER(:name)', { name: cleanedName })
        .getOne();

      if (existing) {
        throw new BadRequestException('Это имя уже занято. Пожалуйста, выберите другое.');
      }

      user.display_name = cleanedName;
    } else {
      user.display_name = null;
    }
    
    return this.usersRepository.save(user);
  }

  private canClaimDailyBonus(user: User): boolean {
    if (!user.last_daily_bonus_at) {
      return true;
    }

    const now = new Date();
    const lastClaim = new Date(user.last_daily_bonus_at);
    
    const nowMoscowStr = now.toLocaleString('en-US', { timeZone: 'Europe/Moscow' });
    const lastClaimMoscowStr = lastClaim.toLocaleString('en-US', { timeZone: 'Europe/Moscow' });
    
    const nowMoscow = new Date(nowMoscowStr);
    const lastClaimMoscow = new Date(lastClaimMoscowStr);

    const resetTimeToday = new Date(nowMoscow);
    resetTimeToday.setHours(1, 0, 0, 0);
    resetTimeToday.setMinutes(0);
    resetTimeToday.setSeconds(0);
    resetTimeToday.setMilliseconds(0);
    
    const resetTime = nowMoscow < resetTimeToday 
      ? new Date(resetTimeToday.getTime() - 24 * 60 * 60 * 1000)
      : resetTimeToday; 
    
    const canClaim = lastClaimMoscow < resetTime;
    
    return canClaim;
  }

  async claimDailyBonus(userId: number): Promise<{ success: boolean; value: number }> {
    const user = await this.findById(userId);
    if (!user) {
      throw new BadRequestException('Пользователь не найден');
    }

    if (!this.canClaimDailyBonus(user)) {
      throw new BadRequestException('Вы уже получили ежедневный бонус сегодня');
    }

    const bonusAmount = 500;
    user.balance = Number(user.balance) + bonusAmount;
    user.last_daily_bonus_at = getMoscowTime();
    
    await this.usersRepository.save(user);

    this.realtimeGateway.emitUserBetsUpdated(userId);
    this.realtimeGateway.emitRankingUpdated();

    return {
      success: true,
      value: bonusAmount,
    };
  }

  async canClaimDailyBonusCheck(userId: number): Promise<{ canClaim: boolean }> {
    const user = await this.findById(userId);
    if (!user) {
      return { canClaim: false };
    }

    const canClaim = this.canClaimDailyBonus(user);
    
    return {
      canClaim,
    };
  }
}


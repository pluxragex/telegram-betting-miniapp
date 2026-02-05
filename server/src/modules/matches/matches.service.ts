import { BadRequestException, Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, In, IsNull, Not, DataSource, EntityManager } from 'typeorm';
import { Match, MatchResult, Bet, BetStatus, User } from '../../database/entities';
import { UsersService } from '../users/users.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { isMatchStarted } from '../../common/utils/timezone.util';

@Injectable()
export class MatchesService implements OnModuleInit, OnModuleDestroy {
  private matchCheckInterval: NodeJS.Timeout | null = null;
  private checkedMatches = new Set<number>(); // Отслеживаем уже проверенные матчи

  constructor(
    @InjectRepository(Match)
    private matchesRepository: Repository<Match>,
    @InjectRepository(Bet)
    private betsRepository: Repository<Bet>,
    private usersService: UsersService,
    private realtimeGateway: RealtimeGateway,
    @InjectDataSource()
    private dataSource: DataSource,
  ) {}

  onModuleInit() {
    // Запускаем периодическую проверку матчей каждые 10 секунд
    this.matchCheckInterval = setInterval(() => {
      this.checkMatchesStart();
    }, 10000); // Проверяем каждые 10 секунд
  }

  onModuleDestroy() {
    if (this.matchCheckInterval) {
      clearInterval(this.matchCheckInterval);
    }
  }

  /**
   * Проверяет матчи и отправляет события о начале матчей
   */
  private async checkMatchesStart() {
    try {
      // Получаем все незавершенные матчи без результата
      const matches = await this.matchesRepository.find({
        where: { result: IsNull() },
        select: ['id', 'start_time', 'group_id'],
      });

      for (const match of matches) {
        // Проверяем, начался ли матч по московскому времени
        if (isMatchStarted(match.start_time)) {
          // Отправляем событие только если еще не отправляли для этого матча
          if (!this.checkedMatches.has(match.id)) {
            this.realtimeGateway.emitMatchStarted(match.id);
            // Также обновляем матчи группы (чтобы все пользователи в группе получили обновление)
            this.realtimeGateway.emitMatchesUpdated(match.group_id);
            this.checkedMatches.add(match.id);
          }
        } else {
          // Если матч еще не начался, но мы его уже отметили как начавшийся (не должно происходить, но на всякий случай)
          if (this.checkedMatches.has(match.id)) {
            this.checkedMatches.delete(match.id);
          }
        }
      }

      // Очищаем завершенные матчи из отслеживания (если они были завершены)
      const finishedMatches = await this.matchesRepository.find({
        where: { result: Not(IsNull()) },
        select: ['id'],
      });
      const finishedMatchIds = new Set(finishedMatches.map(m => m.id));
      for (const matchId of this.checkedMatches) {
        if (finishedMatchIds.has(matchId)) {
          this.checkedMatches.delete(matchId);
        }
      }
    } catch (error) {
      console.error('Error checking matches start:', error);
    }
  }

  async findByGroupId(groupId: number): Promise<Match[]> {
    return this.matchesRepository.find({
      where: { 
        group_id: groupId,
        result: IsNull(), // Исключаем завершенные матчи
      },
      relations: ['team1', 'team2', 'bets'],
      order: { start_time: 'ASC' },
    });
  }

  async findById(id: number): Promise<Match> {
    return this.matchesRepository.findOne({
      where: { id },
      relations: ['team1', 'team2', 'bets'],
    });
  }

  /**
   * Расчет коэффициентов для матча
   * Оптимизировано: использует SQL SUM вместо загрузки всех ставок
   * Добавлены виртуальные ставки V1 и V2 для предотвращения манипуляций с коэффициентами
   * @param matchId ID матча
   * @param entityManager Опциональный EntityManager для использования в активной транзакции
   */
  async calculateCoefficients(matchId: number, entityManager?: EntityManager): Promise<{ p1: number; p2: number }> {
    const match = await this.findById(matchId);
    if (!match) {
      throw new Error('Match not found');
    }

    // Виртуальные ставки для предотвращения манипуляций с коэффициентами
    // V1 и V2 добавляются к реальным ставкам для более плавного изменения коэффициентов
    const V1 = 5000; // Виртуальная ставка на команду 1
    const V2 = 5000; // Виртуальная ставка на команду 2

    // Используем переданный EntityManager, если он есть (для работы внутри транзакции),
    // иначе используем обычный репозиторий
    const betsRepo = entityManager ? entityManager.getRepository(Bet) : this.betsRepository;

    // Используем SQL SUM для расчета суммы ставок - намного быстрее при большом количестве ставок
    const result = await betsRepo
      .createQueryBuilder('bet')
      .select('bet.side', 'side')
      .addSelect('SUM(bet.amount)', 'total')
      .where('bet.match_id = :matchId', { matchId })
      .andWhere('bet.status = :status', { status: BetStatus.PENDING })
      .groupBy('bet.side')
      .getRawMany();

    let totalBetsP1 = 0;
    let totalBetsP2 = 0;

    for (const row of result) {
      const total = parseFloat(row.total || '0');
      if (row.side === 'P1') {
        totalBetsP1 = total;
      } else if (row.side === 'P2') {
        totalBetsP2 = total;
      }
    }

    // Добавляем виртуальные ставки к реальным ставкам
    const betsP1WithVirtual = totalBetsP1 + V1;
    const betsP2WithVirtual = totalBetsP2 + V2;

    // Формула с виртуальными ставками:
    // K T1 = (Bets T1 + V1) + (Bets T2 + V2) / (Bets T1 + V1)
    // K T2 = (Bets T1 + V1) + (Bets T2 + V2) / (Bets T2 + V2)
    const totalPool = betsP1WithVirtual + betsP2WithVirtual;

    // Расчет коэффициентов с учетом виртуальных ставок
    let coefficientP1 = totalPool / Math.max(betsP1WithVirtual, 1);
    let coefficientP2 = totalPool / Math.max(betsP2WithVirtual, 1);

    // Ограничения
    const minCoefficient = 1.10;
    const maxCoefficient = 8.0;

    coefficientP1 = Math.max(minCoefficient, Math.min(maxCoefficient, coefficientP1));
    coefficientP2 = Math.max(minCoefficient, Math.min(maxCoefficient, coefficientP2));

    return {
      p1: parseFloat(coefficientP1.toFixed(2)),
      p2: parseFloat(coefficientP2.toFixed(2)),
    };
  }

  /**
   * Установка результата матча и обработка ставок
   * Оптимизировано для обработки больших объемов ставок (5000+)
   */
  async setResult(matchId: number, result: MatchResult): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Проверяем матч (SQLite не поддерживает pessimistic locks, используем обычный SELECT)
      const match = await queryRunner.manager.findOne(Match, {
        where: { id: matchId },
      });

      if (!match) {
        throw new Error('Match not found');
      }

      if (match.result) {
        throw new Error('Match result already set');
      }

      // Обновляем результат матча
      await queryRunner.manager.update(Match, { id: matchId }, { result });

      // Загружаем все ставки БЕЗ relations для экономии памяти
      const bets = await queryRunner.manager.find(Bet, {
        where: { match_id: matchId, status: BetStatus.PENDING },
        select: ['id', 'user_id', 'side', 'amount', 'coefficient'],
      });

      if (bets.length === 0) {
        await queryRunner.commitTransaction();
        // Уведомляем клиентов об изменениях
        this.realtimeGateway.emitMatchesUpdated(match.group_id);
        this.realtimeGateway.emitMatchesHistoryUpdated();
        this.realtimeGateway.emitRankingUpdated();
        return;
      }

      // Разделяем ставки на выигрышные и проигрышные
      const winningBetIds: number[] = [];
      const losingBetIds: number[] = [];
      const balanceUpdates: Array<{ userId: number; amount: number }> = [];

      for (const bet of bets) {
        const isWin = (bet.side as string) === (result as string);
        
        if (isWin) {
          winningBetIds.push(bet.id);
          const winAmount = parseFloat(bet.amount.toString()) * parseFloat(bet.coefficient.toString());
          balanceUpdates.push({
            userId: bet.user_id,
            amount: winAmount,
          });
        } else {
          losingBetIds.push(bet.id);
        }
      }

      // Массовое обновление статусов выигрышных ставок
      if (winningBetIds.length > 0) {
        await queryRunner.manager.update(
          Bet,
          { id: In(winningBetIds) },
          { status: BetStatus.WIN },
        );
      }

      // Массовое обновление статусов проигрышных ставок
      if (losingBetIds.length > 0) {
        await queryRunner.manager.update(
          Bet,
          { id: In(losingBetIds) },
          { status: BetStatus.LOSE },
        );
      }

      // Массовое обновление балансов (оптимизировано)
      if (balanceUpdates.length > 0) {
        // Группируем обновления по пользователям и суммируем выигрыши
        const userWinnings = new Map<number, number>();
        for (const update of balanceUpdates) {
          const current = userWinnings.get(update.userId) || 0;
          userWinnings.set(update.userId, current + update.amount);
        }

        // Загружаем всех пользователей одним запросом для проверки
        const userIds = Array.from(userWinnings.keys());
        const users = await queryRunner.manager.find(User, {
          where: { id: In(userIds) },
          select: ['id', 'balance'],
        });

        // Проверяем всех пользователей и готовим обновления
        const validUpdates: Array<{ userId: number; newBalance: number }> = [];
        const userBalanceMap = new Map(users.map(u => [u.id, Number(u.balance)]));

        for (const [userId, totalWin] of userWinnings.entries()) {
          const currentBalance = userBalanceMap.get(userId);
          if (currentBalance === undefined) {
            throw new Error(`User ${userId} not found`);
          }

          const newBalance = Number(currentBalance) + Number(totalWin);
          if (!Number.isFinite(newBalance) || newBalance < 0) {
            throw new Error(`Invalid balance calculation for user ${userId}`);
          }

          validUpdates.push({ userId, newBalance });
        }

        // Массовое обновление балансов (по одному UPDATE для каждого пользователя, но в транзакции)
        // Для SQLite используем отдельные UPDATE, для PostgreSQL можно использовать CASE WHEN
        for (const update of validUpdates) {
          await queryRunner.manager.update(
            User,
            { id: update.userId },
            { balance: update.newBalance },
          );
        }
      }

      await queryRunner.commitTransaction();

      // Уведомляем клиентов об изменениях (после коммита транзакции)
      this.realtimeGateway.emitMatchesUpdated(match.group_id);
      this.realtimeGateway.emitMatchesHistoryUpdated();
      this.realtimeGateway.emitRankingUpdated();

      // Обновляем историю ставок для всех пользователей, у кого есть ставки на этот матч
      const affectedUserIds = Array.from(new Set(bets.map((b) => b.user_id)));
      affectedUserIds.forEach((userId) => {
        this.realtimeGateway.emitUserBetsUpdated(Number(userId));
      });
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async create(data: {
    team1_id: number;
    team2_id: number;
    group_id: number;
    start_time: Date;
  }): Promise<Match> {
    const match = this.matchesRepository.create(data);
    return this.matchesRepository.save(match);
  }

  async update(id: number, data: Partial<Match>): Promise<Match> {
    const match = await this.findById(id);
    if (!match) {
      throw new Error('Match not found');
    }
    Object.assign(match, data);
    return this.matchesRepository.save(match);
  }

  async delete(id: number): Promise<void> {
    const match = await this.matchesRepository.findOne({ where: { id } });
    if (!match) {
      return;
    }

    const betsCount = await this.betsRepository.count({ where: { match_id: id } });
    if (betsCount > 0) {
      // Важно: матч с бетами удалять нельзя, иначе потеряем возможность корректного возврата/истории
      throw new BadRequestException('Нельзя удалить матч, у которого есть ставки');
    }

    await this.matchesRepository.delete(id);
  }

  /**
   * Проверка наличия активных матчей в группе
   */
  async hasActiveMatchesByGroupId(groupId: number): Promise<boolean> {
    const count = await this.matchesRepository.count({
      where: {
        group_id: groupId,
        result: IsNull(),
      },
    });
    return count > 0;
  }

  /**
   * Проверка наличия активных матчей у команды
   */
  async hasActiveMatchesByTeamId(teamId: number): Promise<boolean> {
    const count = await this.matchesRepository.count({
      where: [
        { team1_id: teamId, result: IsNull() },
        { team2_id: teamId, result: IsNull() },
      ],
    });
    return count > 0;
  }

  /**
   * Удалить все матчи, связанные с командой
   */
  async deleteByTeamId(teamId: number): Promise<void> {
    // Находим все матчи, связанные с командой
    const matches = await this.matchesRepository.find({
      where: [
        { team1_id: teamId },
        { team2_id: teamId },
      ],
    });

    // Удаляем все ставки для этих матчей
    for (const match of matches) {
      await this.betsRepository.delete({ match_id: match.id });
    }

    // Удаляем матчи
    for (const match of matches) {
      await this.matchesRepository.delete(match.id);
    }
  }

  /**
   * Удалить все матчи группы
   */
  async deleteByGroupId(groupId: number): Promise<void> {
    // Находим все матчи группы
    const matches = await this.matchesRepository.find({
      where: { group_id: groupId },
    });

    // Удаляем все ставки для этих матчей
    for (const match of matches) {
      await this.betsRepository.delete({ match_id: match.id });
    }

    // Удаляем матчи
    await this.matchesRepository.delete({
      group_id: groupId,
    });
  }

  /**
   * Получить все матчи с результатами (для истории)
   */
  async findAllWithResults(page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;
    const [matches, total] = await this.matchesRepository.findAndCount({
      where: { 
        result: In([MatchResult.P1, MatchResult.P2])
      },
      relations: ['team1', 'team2'],
      order: { start_time: 'DESC' },
      skip,
      take: limit,
    });

    return {
      matches: matches.map((match) => ({
        id: match.id,
        team1: {
          id: match.team1.id,
          name: match.team1.name,
        },
        team2: {
          id: match.team2.id,
          name: match.team2.name,
        },
        start_time: match.start_time,
        result: match.result,
        refund_processed: !!(match as any).refund_processed,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findFinishedMatches(
    page: number = 1,
    limit: number = 10,
    search?: string,
  ) {
    // Страхуемся от некорректных значений пагинации (NaN, Infinity, отрицательные)
    const safePage =
      typeof page === 'number' && Number.isFinite(page) && page > 0
        ? Math.floor(page)
        : 1;
    const safeLimit =
      typeof limit === 'number' && Number.isFinite(limit) && limit > 0
        ? Math.floor(limit)
        : 10;

    const skip = (safePage - 1) * safeLimit;
    const qb = this.matchesRepository
      .createQueryBuilder('match')
      .leftJoinAndSelect('match.team1', 'team1')
      .leftJoinAndSelect('match.team2', 'team2')
      .where('match.result IS NOT NULL');

    if (search) {
      const term = `%${search.toLowerCase()}%`;
      qb.andWhere(
        '(LOWER(team1.name) LIKE :search OR LOWER(team2.name) LIKE :search)',
        { search: term },
      );
    }

    const [matches, total] = await qb
      .orderBy('match.start_time', 'DESC')
      .skip(skip)
      .take(safeLimit)
      .getManyAndCount();

    return {
      matches: matches.map((match) => ({
        id: match.id,
        team1: { id: match.team1.id, name: match.team1.name },
        team2: { id: match.team2.id, name: match.team2.name },
        start_time: match.start_time,
        result: match.result,
        refund_processed: !!match.refund_processed,
      })),
      total,
      page: safePage,
      limit: safeLimit,
      totalPages: Math.ceil(total / safeLimit),
    };
  }

  async refundMatch(matchId: number) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const match = await queryRunner.manager.findOne(Match, {
        where: { id: matchId },
      });

      if (!match) {
        throw new BadRequestException('Матч не найден');
      }

      if (!match.result) {
        throw new BadRequestException('Матч еще не завершен');
      }

      if (match.refund_processed) {
        throw new BadRequestException('Возврат по этому матчу уже выполнен');
      }

      const bets = await queryRunner.manager.find(Bet, {
        where: { match_id: matchId },
        select: ['id', 'user_id', 'side', 'amount', 'coefficient', 'status'],
      });

      if (bets.length === 0) {
        await queryRunner.manager.update(Match, { id: matchId }, { refund_processed: true });
        await queryRunner.commitTransaction();
        return {
          refundedBets: 0,
          refundedStakeTotal: 0,
        };
      }

      const balanceUpdates: Array<{ userId: number; amount: number }> = [];
      const betsToRefund: number[] = [];
      let refundedStakeTotal = 0;

      for (const bet of bets) {
        if (bet.status === BetStatus.REFUNDED) {
          continue;
        }

        const amount = parseFloat(bet.amount.toString());
        const coefficient = parseFloat(bet.coefficient.toString());
        let delta = amount;

        if (bet.status === BetStatus.WIN) {
          const payout = amount * coefficient;
          delta = amount - payout;
        }

        balanceUpdates.push({ userId: bet.user_id, amount: delta });
        betsToRefund.push(bet.id);
        refundedStakeTotal += amount;
      }

      if (betsToRefund.length > 0) {
        await queryRunner.manager.update(
          Bet,
          { id: In(betsToRefund) },
          { status: BetStatus.REFUNDED },
        );
      }

      if (balanceUpdates.length > 0) {
        const userDeltas = new Map<number, number>();
        for (const update of balanceUpdates) {
          const current = userDeltas.get(update.userId) || 0;
          userDeltas.set(update.userId, current + update.amount);
        }

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
            console.warn(`User ${userId} not found, skipping refund`);
            continue;
          }

          const newBalance = Number(currentBalance) + Number(totalDelta);
          if (!Number.isFinite(newBalance)) {
            console.warn(`Invalid balance calculation for user ${userId}, skipping refund`);
            continue;
          }

          const finalBalance = newBalance < 0 ? 0 : newBalance;
          if (newBalance < 0) {
            console.warn(`Setting balance to 0 for user ${userId}: balance would be ${newBalance} (current: ${currentBalance}, delta: ${totalDelta})`);
          }

          validUpdates.push({ userId, newBalance: finalBalance });
        }

        for (const update of validUpdates) {
          await queryRunner.manager.update(
            User,
            { id: update.userId },
            { balance: update.newBalance },
          );
        }
      }

      await queryRunner.manager.update(Match, { id: matchId }, { refund_processed: true });

      await queryRunner.commitTransaction();

      this.realtimeGateway.emitMatchesHistoryUpdated();
      this.realtimeGateway.emitRankingUpdated();
      const affectedUserIds = Array.from(new Set(bets.map((b) => b.user_id)));
      affectedUserIds.forEach((userId) => {
        this.realtimeGateway.emitUserBetsUpdated(Number(userId));
      });

      return {
        refundedBets: betsToRefund.length,
        refundedStakeTotal,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}


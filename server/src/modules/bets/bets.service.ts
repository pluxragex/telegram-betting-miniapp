import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Bet, BetSide, BetStatus, Match, User } from '../../database/entities';
import { UsersService } from '../users/users.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { MatchesService } from '../matches/matches.service';
import { isMatchStarted } from '../../common/utils/timezone.util';

@Injectable()
export class BetsService {
  constructor(
    @InjectRepository(Bet)
    private betsRepository: Repository<Bet>,
    @InjectRepository(Match)
    private matchesRepository: Repository<Match>,
    private usersService: UsersService,
    private matchesService: MatchesService,
    private realtimeGateway: RealtimeGateway,
    @InjectDataSource()
    private dataSource: DataSource,
  ) {}

  async create(
    userId: number,
    matchId: number,
    side: BetSide,
    amount: number,
  ): Promise<Bet> {
    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      throw new BadRequestException('Invalid bet amount');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const user = await queryRunner.manager.findOne(User, {
        where: { id: userId },
      });
      if (!user) {
        throw new BadRequestException('User not found');
      }

      if (Number(user.balance) < numericAmount) {
        throw new BadRequestException('Insufficient balance');
      }

      const match = await queryRunner.manager.findOne(Match, {
        where: { id: matchId },
        relations: ['team1', 'team2'],
      });
      if (!match) {
        throw new BadRequestException('Match not found');
      }

      if (isMatchStarted(match.start_time)) {
        throw new BadRequestException('Match has already started');
      }

      if (match.result) {
        throw new BadRequestException('Match result already set');
      }

      const coefficients = await this.matchesService.calculateCoefficients(matchId, queryRunner.manager);
      const coefficient = side === BetSide.P1 ? coefficients.p1 : coefficients.p2;

      const bet = queryRunner.manager.create(Bet, {
        user_id: userId,
        match_id: matchId,
        side,
        amount: numericAmount,
        coefficient,
        status: BetStatus.PENDING,
      });

      const newBalance = Number(user.balance) - numericAmount;
      await queryRunner.manager.update(
        User,
        { id: userId },
        { balance: newBalance },
      );

      const savedBet = await queryRunner.manager.save(bet);

      await queryRunner.commitTransaction();

      this.realtimeGateway.emitOddsUpdated(matchId);
      this.realtimeGateway.emitUserBetsUpdated(userId);
      this.realtimeGateway.emitRankingUpdated();

      return savedBet;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async findByUserId(userId: number, page: number = 1, limit: number = 10) {
    const safePage =
      typeof page === 'number' && Number.isFinite(page) && page > 0
        ? Math.floor(page)
        : 1;
    const safeLimit =
      typeof limit === 'number' && Number.isFinite(limit) && limit > 0
        ? Math.floor(limit)
        : 10;

    const skip = (safePage - 1) * safeLimit;
    const [bets, total] = await this.betsRepository.findAndCount({
      where: { user_id: userId },
      relations: ['match', 'match.team1', 'match.team2'],
      order: { created_at: 'DESC' },
      skip,
      take: safeLimit,
    });

    return {
      bets: bets.map((bet) => ({
        id: bet.id,
        match: {
          id: bet.match.id,
          team1: bet.match.team1.name,
          team2: bet.match.team2.name,
        },
        side: bet.side,
        amount: bet.amount,
        coefficient: bet.coefficient,
        status: bet.status,
        created_at: bet.created_at,
      })),
      total,
      page: safePage,
      limit: safeLimit,
      totalPages: Math.ceil(total / safeLimit),
    };
  }
}


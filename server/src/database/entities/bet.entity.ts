import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Check,
} from 'typeorm';
import { User } from './user.entity';
import { Match } from './match.entity';

export enum BetSide {
  P1 = 'P1',
  P2 = 'P2',
}

export enum BetStatus {
  PENDING = 'pending',
  WIN = 'win',
  LOSE = 'lose',
  REFUNDED = 'refunded',
}

@Entity('bets')
@Check(`"side" IN ('P1', 'P2')`)
@Check(`"status" IN ('pending', 'win', 'lose', 'refunded')`)
@Check(`"amount" > 0`)
export class Bet {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  @Index()
  user_id: number;

  @Column()
  @Index()
  match_id: number;

  @Column({ type: 'varchar' })
  side: BetSide;

  @Column('decimal', {
    precision: 10,
    scale: 2,
    transformer: {
      to: (value: number) => value,
      from: (value: string | number) => Number(value),
    },
  })
  amount: number;

  @Column('decimal', {
    precision: 10,
    scale: 2,
    transformer: {
      to: (value: number) => value,
      from: (value: string | number) => Number(value),
    },
  })
  coefficient: number;

  @Column({ type: 'varchar', default: BetStatus.PENDING })
  @Index()
  status: BetStatus;

  @CreateDateColumn()
  @Index()
  created_at: Date;

  @ManyToOne(() => User, (user) => user.bets, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Match, (match) => match.bets, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'match_id' })
  match: Match;
}


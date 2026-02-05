import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { Bet } from './bet.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  @Index()
  telegram_id: string;

  @Column({ nullable: true })
  username: string;

  @Column({ nullable: true })
  display_name: string;

  @Column({ default: false })
  @Index()
  participation: boolean;

  @Column('decimal', {
    precision: 10,
    scale: 2,
    default: 1000,
    transformer: {
      to: (value: number) => value,
      from: (value: string | number) => Number(value),
    },
  })
  balance: number;

  @CreateDateColumn()
  created_at: Date;

  @Column({ type: 'datetime', nullable: true })
  @Index()
  last_daily_bonus_at: Date | null;

  @OneToMany(() => Bet, (bet) => bet.user)
  bets: Bet[];
}


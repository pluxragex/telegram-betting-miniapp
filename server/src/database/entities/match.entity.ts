import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
  Check,
} from 'typeorm';
import { Group } from './group.entity';
import { Team } from './team.entity';
import { Bet } from './bet.entity';

export enum MatchResult {
  P1 = 'P1',
  P2 = 'P2',
}

@Entity('matches')
@Check(`"team1_id" != "team2_id"`)
export class Match {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  @Index()
  team1_id: number;

  @Column()
  @Index()
  team2_id: number;

  @Column()
  @Index()
  group_id: number;

  @Column('datetime')
  start_time: Date;

  @Column({ type: 'varchar', nullable: true })
  @Index()
  result: MatchResult | null;

  @Column({ type: 'boolean', default: false })
  @Index()
  refund_processed: boolean;

  @CreateDateColumn()
  created_at: Date;

  @ManyToOne(() => Team, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'team1_id' })
  team1: Team;

  @ManyToOne(() => Team, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'team2_id' })
  team2: Team;

  @ManyToOne(() => Group, (group) => group.matches, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'group_id' })
  group: Group;

  @OneToMany(() => Bet, (bet) => bet.match)
  bets: Bet[];
}


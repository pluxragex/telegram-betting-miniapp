import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { Group } from './group.entity';
import { Match } from './match.entity';

@Entity('teams')
export class Team {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column('text', { nullable: true })
  logo_url: string | null;

  @Column()
  @Index()
  group_id: number;

  @ManyToOne(() => Group, (group) => group.teams, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'group_id' })
  group: Group;

  @OneToMany(() => Match, (match) => match.team1)
  matchesAsTeam1: Match[];

  @OneToMany(() => Match, (match) => match.team2)
  matchesAsTeam2: Match[];

  @CreateDateColumn()
  created_at: Date;

  @Column({ default: true })
  @Index()
  is_active: boolean;
}


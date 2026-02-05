import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { Team } from './team.entity';
import { Match } from './match.entity';

@Entity('groups')
export class Group {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  @Index()
  name: string;

  @CreateDateColumn()
  created_at: Date;

  @Column({ default: true })
  @Index()
  is_active: boolean;

  @OneToMany(() => Team, (team) => team.group)
  teams: Team[];

  @OneToMany(() => Match, (match) => match.group)
  matches: Match[];
}


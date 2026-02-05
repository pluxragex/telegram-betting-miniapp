import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { BonusCode } from './bonus-code.entity';
import { User } from './user.entity';

@Entity('bonus_code_usages')
export class BonusCodeUsage {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  @Index()
  bonus_code_id: number;

  @Column()
  @Index()
  user_id: number;

  @CreateDateColumn()
  @Index()
  used_at: Date;

  @ManyToOne(() => BonusCode, (bonusCode) => bonusCode.usages, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'bonus_code_id' })
  bonus_code: BonusCode;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;
}

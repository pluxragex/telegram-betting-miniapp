import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { BonusCodeUsage } from './bonus-code-usage.entity';

@Entity('bonus_codes')
export class BonusCode {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  @Index()
  code: string;

  @Column('decimal', {
    precision: 10,
    scale: 2,
    transformer: {
      to: (value: number) => value,
      from: (value: string | number) => Number(value),
    },
  })
  value: number;

  @Column({ nullable: true })
  max_uses: number | null; // null = разовый, число = максимальное количество использований

  @Column({ default: 0 })
  used_count: number;

  @CreateDateColumn()
  created_at: Date;

  @OneToMany(() => BonusCodeUsage, (usage) => usage.bonus_code)
  usages: BonusCodeUsage[];
}

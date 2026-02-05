import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('ranking_settings')
export class RankingSettings {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'integer', default: 15 })
  ranking_limit: number;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}


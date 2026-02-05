import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('prizes')
export class Prize {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  @Index()
  position: number;

  @Column('text')
  image_url: string;

  @CreateDateColumn()
  created_at: Date;
}

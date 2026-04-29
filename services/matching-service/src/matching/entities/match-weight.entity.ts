import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Unique,
  Index,
} from 'typeorm';
export { MatchFactor, WeightScope } from './enums';
import { MatchFactor, WeightScope } from './enums';

@Entity('match_weights')
@Unique(['factorName', 'scope', 'scopeId'])
@Index('idx_match_weights_scope', ['scope', 'scopeId'])
@Index('idx_match_weights_active', ['isActive'])
export class MatchWeight {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'factor_name', type: 'enum', enum: MatchFactor })
  factorName: MatchFactor;

  @Column({ type: 'decimal', precision: 4, scale: 3 })
  weight: number;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ type: 'enum', enum: WeightScope, default: WeightScope.GLOBAL })
  scope: WeightScope;

  @Column({ name: 'scope_id', type: 'uuid', nullable: true })
  scopeId: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}

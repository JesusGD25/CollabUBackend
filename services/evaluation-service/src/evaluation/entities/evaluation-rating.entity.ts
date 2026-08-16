import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from 'typeorm';

/**
 * Sin relaciones `@ManyToOne` a `evaluation_id`/`criterion_id`: tenerlas junto
 * a las columnas escalares (mismo nombre de columna físico en ambas) hacía que
 * TypeORM, al insertar vía `repo.create({ evaluationId, ... })` sin poblar la
 * propiedad de relación `evaluation`, generara el INSERT priorizando el valor
 * (vacío) de la relación sobre el escalar — `evaluation_id` llegaba `null` pese
 * a asignarlo explícitamente. Nadie en el código leía `rating.evaluation` ni
 * `rating.criterion`, así que se quitan y quedan solo las columnas UUID.
 */
@Entity('evaluation_ratings')
export class EvaluationRating {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'evaluation_id' })
  evaluationId: string;

  @Column({ name: 'criterion_id' })
  criterionId: string;

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  score: number;

  @Column({ type: 'text', nullable: true })
  comment: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}

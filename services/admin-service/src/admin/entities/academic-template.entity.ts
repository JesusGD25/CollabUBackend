import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum TemplateType {
  ANTEPROYECTO = 'anteproyecto',
  PROYECTO_FINAL = 'proyecto_final',
  INFORME_AVANCE = 'informe_avance',
  ACTA_INICIO = 'acta_inicio',
  OTRO = 'otro',
}

@Entity('academic_templates')
@Index('idx_academic_templates_program_type', ['programCode', 'type'])
export class AcademicTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'program_code', length: 20 })
  programCode: string;

  @Column({ type: 'enum', enum: TemplateType })
  type: TemplateType;

  @Column({ length: 200 })
  name: string;

  @Column({ name: 'file_id', type: 'uuid' })
  fileId: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'created_by', type: 'uuid' })
  createdBy: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}

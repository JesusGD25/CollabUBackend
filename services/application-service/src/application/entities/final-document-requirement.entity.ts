import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';

/**
 * Actor que debe subir un documento final. A diferencia de los documentos
 * globales (pre_initiation / post_initiation) donde solo participan
 * estudiante y empresa, en la etapa de finalización el asesor también
 * puede aportar documentos (acta de asesoría, informe de seguimiento, etc.).
 */
export enum FinalDocActorType {
  STUDENT = 'student',
  COMPANY = 'company',
  ASESOR = 'asesor',
}

/**
 * Requisito de documento final creado ad-hoc por el admin al iniciar la
 * finalización de un proyecto. No se define en el catálogo global de admin
 * porque cada proyecto puede necesitar documentos distintos según su tipo,
 * la empresa involucrada y las particularidades académicas.
 */
@Entity('final_document_requirements')
@Index('idx_final_doc_req_application', ['applicationId'])
export class FinalDocumentRequirement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'application_id', type: 'uuid' })
  applicationId: string;

  @Column({ length: 200 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'actor_type', type: 'enum', enum: FinalDocActorType })
  actorType: FinalDocActorType;

  @Column({ name: 'is_mandatory', default: true })
  isMandatory: boolean;

  @Column({ name: 'display_order', type: 'int', default: 0 })
  displayOrder: number;

  @Column({ name: 'created_by', type: 'uuid' })
  createdBy: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}

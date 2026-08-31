import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
  Unique,
} from 'typeorm';

/**
 * Vínculo entre una postulación y un `DocumentRequirement` del catálogo
 * global de admin-service. El catálogo (`document_requirements`, admin-service)
 * sigue siendo la fuente de verdad de la definición del documento — este
 * registro solo dice "este proyecto pidió este documento del catálogo".
 *
 * Antes de esto, `getInitiationChecklist`/`DocumentsPanelComponent` aplicaban
 * TODOS los `document_requirements` con `requiredAtStage=pre_initiation` a
 * TODOS los proyectos por igual — no existía selección por proyecto. El admin
 * ahora elige, por proyecto, cuáles de los ya creados aplican (o crea uno
 * nuevo en el catálogo y lo vincula aquí).
 */
@Entity('project_document_requirements')
@Index('idx_project_doc_req_application', ['applicationId'])
@Unique(['applicationId', 'documentRequirementId'])
export class ProjectDocumentRequirement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'application_id', type: 'uuid' })
  applicationId: string;

  @Column({ name: 'document_requirement_id', type: 'uuid' })
  documentRequirementId: string;

  @Column({ name: 'added_by', type: 'uuid' })
  addedBy: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}

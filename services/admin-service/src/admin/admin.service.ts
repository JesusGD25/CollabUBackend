import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere, IsNull, ILike, In } from 'typeorm';
import { EventPublisher, MicroserviceHttpClient, DepartmentScope, assertInScope } from '@collab-u/shared';

import { AcademicPeriod, PeriodStatus } from './entities/academic-period.entity';
import { AcademicProgram } from './entities/academic-program.entity';
import { CompanyVerification, VerificationAction } from './entities/company-verification.entity';
import { Supervisor } from './entities/supervisor.entity';
import { SupervisorAssignment, AssignmentRole, AssignmentStatus } from './entities/supervisor-assignment.entity';
import { SupervisorAssignmentHistory, AssignmentHistoryAction } from './entities/supervisor-assignment-history.entity';
import { SystemSetting } from './entities/system-setting.entity';
import { ProjectRejectionCategory } from './entities/project-rejection-category.entity';
import { AcademicTemplate } from './entities/academic-template.entity';
import { DocumentRequirement } from './entities/document-requirement.entity';
import { SkillCatalog, SkillCategory } from './entities/skill-catalog.entity';
import { SkillProgramMapping } from './entities/skill-program-mapping.entity';
import { AssignmentWorkflowService, AssignmentResult } from './assignment-workflow.service';

import {
  CreateAcademicPeriodDto,
  UpdateAcademicPeriodDto,
  CreateAcademicProgramDto,
  UpdateAcademicProgramDto,
  VerifyCompanyDto,
  AssignSupervisorDto,
  CreateSupervisorDto,
  UpdateSystemSettingDto,
  PeriodsQueryDto,
  UpdateSupervisorDto,
  CreateRejectionCategoryDto,
  UpdateRejectionCategoryDto,
  DeclineAssignmentDto,
  ReplaceAssignmentDto,
  CreateAcademicTemplateDto,
  UpdateAcademicTemplateDto,
  CreateDocumentRequirementDto,
  UpdateDocumentRequirementDto,
  AssignJuradoDto,
  CreateSkillCatalogDto,
  UpdateSkillCatalogDto,
} from './dto';

const DEFAULT_ACADEMIC_PROGRAMS = [
  { name: 'Ingeniería de Sistemas', code: 'ING-SIS', faculty: 'Facultad de Ingeniería', totalSemesters: 10, requiresInternship: true, minimumSemesterForInternship: 7 },
  { name: 'Ingeniería Electrónica', code: 'ING-ELE', faculty: 'Facultad de Ingeniería', totalSemesters: 10, requiresInternship: true, minimumSemesterForInternship: 7 },
  { name: 'Ingeniería Civil', code: 'ING-CIV', faculty: 'Facultad de Ingeniería', totalSemesters: 10, requiresInternship: true, minimumSemesterForInternship: 7 },
];

const DEFAULT_REJECTION_CATEGORIES = [
  { name: 'Objeto no académico', description: 'El proyecto no tiene relación con formación universitaria', displayOrder: 1 },
  { name: 'Requisitos insuficientes o mal definidos', description: null, displayOrder: 2 },
  { name: 'Empresa no cumple perfil para este tipo de proyecto', description: null, displayOrder: 3 },
  { name: 'Información incompleta o inconsistente', description: null, displayOrder: 4 },
  { name: 'Duración o compensación no adecuada para práctica académica', description: null, displayOrder: 5 },
  { name: 'Otro', description: 'Motivo distinto a las categorías anteriores', displayOrder: 99 },
];

export function normalizeSkillName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/\.js$/i, '')
    .replace(/\.ts$/i, '');
}

/** Grupo usado solo para la asociación best-effort con programas al sembrar el catálogo. */
type SeedGroup = 'sistemas' | 'civil' | 'electronica' | 'general';

const DEFAULT_SKILLS: { name: string; category: SkillCategory; groups: SeedGroup[] }[] = [
  // Sistemas — lenguajes
  { name: 'JavaScript', category: SkillCategory.LANGUAGE, groups: ['sistemas'] },
  { name: 'TypeScript', category: SkillCategory.LANGUAGE, groups: ['sistemas'] },
  { name: 'Python', category: SkillCategory.LANGUAGE, groups: ['sistemas'] },
  { name: 'Java', category: SkillCategory.LANGUAGE, groups: ['sistemas'] },
  { name: 'C#', category: SkillCategory.LANGUAGE, groups: ['sistemas'] },
  { name: 'Go', category: SkillCategory.LANGUAGE, groups: ['sistemas'] },
  { name: 'SQL', category: SkillCategory.LANGUAGE, groups: ['sistemas'] },
  { name: 'PHP', category: SkillCategory.LANGUAGE, groups: ['sistemas'] },
  { name: 'Ruby', category: SkillCategory.LANGUAGE, groups: ['sistemas'] },
  { name: 'Kotlin', category: SkillCategory.LANGUAGE, groups: ['sistemas'] },
  { name: 'Swift', category: SkillCategory.LANGUAGE, groups: ['sistemas'] },
  // Sistemas — frameworks
  { name: 'Angular', category: SkillCategory.FRAMEWORK, groups: ['sistemas'] },
  { name: 'React', category: SkillCategory.FRAMEWORK, groups: ['sistemas'] },
  { name: 'Vue', category: SkillCategory.FRAMEWORK, groups: ['sistemas'] },
  { name: 'Node.js', category: SkillCategory.FRAMEWORK, groups: ['sistemas'] },
  { name: 'NestJS', category: SkillCategory.FRAMEWORK, groups: ['sistemas'] },
  { name: 'Django', category: SkillCategory.FRAMEWORK, groups: ['sistemas'] },
  { name: 'Spring Boot', category: SkillCategory.FRAMEWORK, groups: ['sistemas'] },
  { name: 'Flutter', category: SkillCategory.FRAMEWORK, groups: ['sistemas'] },
  { name: '.NET', category: SkillCategory.FRAMEWORK, groups: ['sistemas'] },
  // Sistemas — herramientas
  { name: 'Docker', category: SkillCategory.TOOL, groups: ['sistemas'] },
  { name: 'Kubernetes', category: SkillCategory.TOOL, groups: ['sistemas'] },
  { name: 'Git', category: SkillCategory.TOOL, groups: ['sistemas'] },
  { name: 'PostgreSQL', category: SkillCategory.TOOL, groups: ['sistemas'] },
  { name: 'MongoDB', category: SkillCategory.TOOL, groups: ['sistemas'] },
  { name: 'Redis', category: SkillCategory.TOOL, groups: ['sistemas'] },
  { name: 'AWS', category: SkillCategory.TOOL, groups: ['sistemas'] },
  { name: 'Azure', category: SkillCategory.TOOL, groups: ['sistemas'] },
  { name: 'Google Cloud', category: SkillCategory.TOOL, groups: ['sistemas'] },
  { name: 'Figma', category: SkillCategory.TOOL, groups: ['sistemas'] },
  // Sistemas — conceptos
  { name: 'REST APIs', category: SkillCategory.CONCEPT, groups: ['sistemas'] },
  { name: 'GraphQL', category: SkillCategory.CONCEPT, groups: ['sistemas'] },
  { name: 'Microservicios', category: SkillCategory.CONCEPT, groups: ['sistemas'] },
  { name: 'Machine Learning', category: SkillCategory.CONCEPT, groups: ['sistemas'] },
  { name: 'Análisis de datos', category: SkillCategory.CONCEPT, groups: ['sistemas'] },
  { name: 'Ciberseguridad', category: SkillCategory.CONCEPT, groups: ['sistemas'] },
  { name: 'DevOps', category: SkillCategory.CONCEPT, groups: ['sistemas'] },
  { name: 'Testing', category: SkillCategory.CONCEPT, groups: ['sistemas'] },
  { name: 'CI/CD', category: SkillCategory.CONCEPT, groups: ['sistemas'] },
  { name: 'Metodologías ágiles', category: SkillCategory.CONCEPT, groups: ['sistemas'] },

  // Civil — herramientas
  { name: 'AutoCAD', category: SkillCategory.TOOL, groups: ['civil'] },
  { name: 'Revit', category: SkillCategory.TOOL, groups: ['civil'] },
  { name: 'SAP2000', category: SkillCategory.TOOL, groups: ['civil'] },
  { name: 'ETABS', category: SkillCategory.TOOL, groups: ['civil'] },
  { name: 'Civil 3D', category: SkillCategory.TOOL, groups: ['civil'] },
  { name: 'ArcGIS', category: SkillCategory.TOOL, groups: ['civil'] },
  { name: 'MS Project', category: SkillCategory.TOOL, groups: ['civil'] },
  { name: 'PrimusWin', category: SkillCategory.TOOL, groups: ['civil'] },
  // Civil — conceptos
  { name: 'Diseño estructural', category: SkillCategory.CONCEPT, groups: ['civil'] },
  { name: 'Hidráulica', category: SkillCategory.CONCEPT, groups: ['civil'] },
  { name: 'Hidrología', category: SkillCategory.CONCEPT, groups: ['civil'] },
  { name: 'Geotecnia', category: SkillCategory.CONCEPT, groups: ['civil'] },
  { name: 'Topografía', category: SkillCategory.CONCEPT, groups: ['civil'] },
  { name: 'Gestión de obras', category: SkillCategory.CONCEPT, groups: ['civil'] },
  { name: 'Presupuestos y APUs', category: SkillCategory.CONCEPT, groups: ['civil'] },
  { name: 'Control de calidad', category: SkillCategory.CONCEPT, groups: ['civil'] },
  { name: 'Interventoría', category: SkillCategory.CONCEPT, groups: ['civil'] },
  { name: 'Concreto reforzado', category: SkillCategory.CONCEPT, groups: ['civil'] },
  { name: 'Estructuras metálicas', category: SkillCategory.CONCEPT, groups: ['civil'] },
  { name: 'Vías y pavimentos', category: SkillCategory.CONCEPT, groups: ['civil'] },
  { name: 'Sostenibilidad y LEED', category: SkillCategory.CONCEPT, groups: ['civil'] },

  // Electrónica — lenguajes
  { name: 'C', category: SkillCategory.LANGUAGE, groups: ['electronica'] },
  { name: 'C++', category: SkillCategory.LANGUAGE, groups: ['electronica'] },
  { name: 'VHDL', category: SkillCategory.LANGUAGE, groups: ['electronica'] },
  { name: 'Verilog', category: SkillCategory.LANGUAGE, groups: ['electronica'] },
  { name: 'Assembler', category: SkillCategory.LANGUAGE, groups: ['electronica'] },
  // Electrónica — frameworks/plataformas
  { name: 'Arduino', category: SkillCategory.FRAMEWORK, groups: ['electronica'] },
  { name: 'ESP32', category: SkillCategory.FRAMEWORK, groups: ['electronica'] },
  { name: 'STM32', category: SkillCategory.FRAMEWORK, groups: ['electronica'] },
  { name: 'PIC', category: SkillCategory.FRAMEWORK, groups: ['electronica'] },
  { name: 'PLC', category: SkillCategory.FRAMEWORK, groups: ['electronica'] },
  // Electrónica — herramientas
  { name: 'Proteus', category: SkillCategory.TOOL, groups: ['electronica'] },
  { name: 'MATLAB/Simulink', category: SkillCategory.TOOL, groups: ['electronica'] },
  { name: 'LabVIEW', category: SkillCategory.TOOL, groups: ['electronica'] },
  { name: 'KiCad', category: SkillCategory.TOOL, groups: ['electronica'] },
  { name: 'Altium Designer', category: SkillCategory.TOOL, groups: ['electronica'] },
  { name: 'Multisim', category: SkillCategory.TOOL, groups: ['electronica'] },
  // Electrónica — conceptos
  { name: 'Diseño de PCBs', category: SkillCategory.CONCEPT, groups: ['electronica'] },
  { name: 'Sistemas embebidos', category: SkillCategory.CONCEPT, groups: ['electronica'] },
  { name: 'IoT', category: SkillCategory.CONCEPT, groups: ['electronica'] },
  { name: 'Automatización industrial', category: SkillCategory.CONCEPT, groups: ['electronica'] },
  { name: 'Control automático', category: SkillCategory.CONCEPT, groups: ['electronica'] },
  { name: 'Procesamiento de señales', category: SkillCategory.CONCEPT, groups: ['electronica'] },
  { name: 'Comunicaciones inalámbricas', category: SkillCategory.CONCEPT, groups: ['electronica'] },
  { name: 'Robótica', category: SkillCategory.CONCEPT, groups: ['electronica'] },
  { name: 'Electrónica de potencia', category: SkillCategory.CONCEPT, groups: ['electronica'] },

  // Transversales — blandas (siempre visibles, no requieren asociación explícita)
  { name: 'Trabajo en equipo', category: SkillCategory.SOFT_SKILL, groups: ['general'] },
  { name: 'Comunicación efectiva', category: SkillCategory.SOFT_SKILL, groups: ['general'] },
  { name: 'Resolución de problemas', category: SkillCategory.SOFT_SKILL, groups: ['general'] },
  { name: 'Pensamiento crítico', category: SkillCategory.SOFT_SKILL, groups: ['general'] },
  { name: 'Liderazgo', category: SkillCategory.SOFT_SKILL, groups: ['general'] },
  { name: 'Gestión del tiempo', category: SkillCategory.SOFT_SKILL, groups: ['general'] },
  { name: 'Inglés técnico', category: SkillCategory.SOFT_SKILL, groups: ['general'] },
  { name: 'Redacción técnica', category: SkillCategory.SOFT_SKILL, groups: ['general'] },
];

const DEFAULT_SYSTEM_SETTINGS: { key: string; value: unknown; description: string; category: string }[] = [
  {
    key: 'anteproyecto.jurado_review_business_days',
    value: 8,
    description: 'Días hábiles que tiene el jurado para revisar el anteproyecto',
    category: 'anteproyecto',
  },
  {
    key: 'anteproyecto.student_revision_business_days',
    value: 5,
    description: 'Días hábiles que tiene el estudiante para responder a una corrección',
    category: 'anteproyecto',
  },
  {
    key: 'anteproyecto.max_corrections',
    value: 2,
    description: 'Número máximo de ciclos de corrección antes de que el jurado deba decidir',
    category: 'anteproyecto',
  },
  {
    key: 'holidays_colombia',
    value: [] as string[],
    description: 'Fechas de festivos colombianos (YYYY-MM-DD) usadas para calcular días hábiles',
    category: 'calendar',
  },
];

@Injectable()
export class AdminService implements OnModuleInit {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    @InjectRepository(AcademicPeriod)
    private readonly periodRepo: Repository<AcademicPeriod>,

    @InjectRepository(AcademicProgram)
    private readonly programRepo: Repository<AcademicProgram>,

    @InjectRepository(CompanyVerification)
    private readonly verificationRepo: Repository<CompanyVerification>,

    @InjectRepository(Supervisor)
    private readonly supervisorRepo: Repository<Supervisor>,

    @InjectRepository(SupervisorAssignment)
    private readonly assignmentRepo: Repository<SupervisorAssignment>,

    @InjectRepository(SystemSetting)
    private readonly settingRepo: Repository<SystemSetting>,

    @InjectRepository(ProjectRejectionCategory)
    private readonly rejectionCategoryRepo: Repository<ProjectRejectionCategory>,

    @InjectRepository(SupervisorAssignmentHistory)
    private readonly historyRepo: Repository<SupervisorAssignmentHistory>,

    @InjectRepository(AcademicTemplate)
    private readonly templateRepo: Repository<AcademicTemplate>,

    @InjectRepository(DocumentRequirement)
    private readonly documentRequirementRepo: Repository<DocumentRequirement>,

    @InjectRepository(SkillCatalog)
    private readonly skillCatalogRepo: Repository<SkillCatalog>,

    @InjectRepository(SkillProgramMapping)
    private readonly skillProgramMappingRepo: Repository<SkillProgramMapping>,

    private readonly eventPublisher: EventPublisher,
    private readonly httpClient: MicroserviceHttpClient,
    private readonly assignments: AssignmentWorkflowService,
  ) {}

  async onModuleInit() {
    const count = await this.rejectionCategoryRepo.count();
    if (count === 0) {
      this.logger.log('Sembrando categorías de rechazo de proyecto por defecto');
      const categories = DEFAULT_REJECTION_CATEGORIES.map((c) => this.rejectionCategoryRepo.create(c));
      await this.rejectionCategoryRepo.save(categories);
    }

    for (const setting of DEFAULT_SYSTEM_SETTINGS) {
      const existing = await this.settingRepo.findOne({ where: { key: setting.key } });
      if (!existing) {
        this.logger.log(`Sembrando configuración por defecto: ${setting.key}`);
        await this.settingRepo.save(this.settingRepo.create(setting));
      }
    }

    await this.seedAcademicPrograms();
    await this.seedSkillCatalog();
    await this.syncSkillProgramMappings();
    await this.backfillSupervisorPrograms();
    // application-service puede arrancar después: se reintenta (idempotente).
    [10000, 60000, 150000].forEach((delay) =>
      setTimeout(() => {
        this.backfillAssignmentPrograms().catch((err) =>
          this.logger.warn(`Backfill de program_id en asignaciones omitido: ${err.message}`),
        );
      }, delay),
    );
  }

  // ─── Alcance por departamento ──────────────────────────────────────────────────

  /** Departamento del admin (programa académico) o 403 si su cuenta apunta a uno inexistente. */
  private async scopeProgram(scope: DepartmentScope | null): Promise<AcademicProgram | null> {
    if (!scope || scope.all) return null;
    const program = await this.programRepo.findOne({ where: { id: scope.departmentId } });
    if (!program) {
      throw new ForbiddenException('Tu departamento ya no existe en el catálogo de programas.');
    }
    return program;
  }

  private async assertActiveProgram(programId: string): Promise<AcademicProgram> {
    const program = await this.programRepo.findOne({ where: { id: programId } });
    if (!program || !program.isActive) {
      throw new BadRequestException('El departamento indicado no existe o está inactivo.');
    }
    return program;
  }

  /** Docentes previos a la división: se deduce el departamento del texto libre `department`. */
  private async backfillSupervisorPrograms(): Promise<void> {
    const pending = await this.supervisorRepo.find({ where: { programId: IsNull() } });
    if (pending.length === 0) return;
    const programs = await this.programRepo.find({ where: { isActive: true } });
    const norm = (v: string) => normalizeSkillName(v).replace(/^ingenieria( de)? /, '');
    let updated = 0;
    for (const sup of pending) {
      if (!sup.department) continue;
      const text = norm(sup.department);
      const match = programs.find((p) => {
        const name = norm(p.name);
        return name === text || text.includes(name) || name.includes(text);
      });
      if (match) {
        await this.supervisorRepo.update(sup.id, { programId: match.id });
        updated++;
      }
    }
    if (updated) this.logger.log(`Backfill program_id en docentes: ${updated}/${pending.length}`);
  }

  /** Asignaciones previas: toman el departamento de la postulación (mejor esfuerzo). */
  private async backfillAssignmentPrograms(): Promise<void> {
    const pending = await this.assignmentRepo.find({ where: { programId: IsNull() }, select: ['id', 'applicationId'] });
    if (pending.length === 0) return;
    const cache = new Map<string, string | null>();
    let updated = 0;
    for (const a of pending) {
      if (!cache.has(a.applicationId)) {
        try {
          const app = await this.httpClient.get<{ programId?: string | null }>('application', `/internal/applications/${a.applicationId}/enriched`);
          cache.set(a.applicationId, app?.programId ?? null);
        } catch {
          cache.set(a.applicationId, null);
        }
      }
      const programId = cache.get(a.applicationId);
      if (programId) {
        await this.assignmentRepo.update(a.id, { programId });
        updated++;
      }
    }
    this.logger.log(`Backfill program_id en asignaciones: ${updated}/${pending.length}`);
  }

  private async seedAcademicPrograms(): Promise<void> {
    const count = await this.programRepo.count();
    if (count > 0) return;

    this.logger.log('Sembrando programas académicos por defecto');
    for (const prog of DEFAULT_ACADEMIC_PROGRAMS) {
      await this.programRepo.save(this.programRepo.create({ ...prog, isActive: true }));
    }
  }

  /** Siembra el catálogo maestro de habilidades una sola vez (idempotente por nombre normalizado). */
  private async seedSkillCatalog(): Promise<void> {
    const count = await this.skillCatalogRepo.count();
    if (count > 0) return;

    this.logger.log('Sembrando catálogo de habilidades por defecto');

    for (const skill of DEFAULT_SKILLS) {
      await this.skillCatalogRepo.save(
        this.skillCatalogRepo.create({
          name: normalizeSkillName(skill.name),
          displayName: skill.name,
          category: skill.category,
          isActive: true,
          createdBy: null,
        }),
      );
    }
  }

  /**
   * Reconcilia skill_program_mapping contra los programas académicos actuales, en cada arranque.
   *
   * Separado de `seedSkillCatalog()` a propósito: si los programas académicos todavía no
   * existían cuando el catálogo de habilidades se sembró por primera vez (orden de arranque
   * entre el seed de la app y `seed_test_data.sql`, que crea los programas por su cuenta),
   * los mappings se perdían para siempre porque `seedSkillCatalog()` solo corre una vez.
   * Esta reconciliación corre siempre, es idempotente (respeta `UNIQUE(skillId, programId)`)
   * y solo crea los pares que falten — no reordena ni duplica los que ya existen.
   */
  private async syncSkillProgramMappings(): Promise<void> {
    const programs = await this.programRepo.find();
    if (programs.length === 0) return;

    const groupToProgramIds = (group: SeedGroup): string[] => {
      if (group === 'general') return [];
      const keyword = group === 'sistemas' ? 'sistema' : group === 'civil' ? 'civil' : 'electr';
      return programs.filter((p) => p.name.toLowerCase().includes(keyword)).map((p) => p.id);
    };

    const catalogEntries = await this.skillCatalogRepo.find();
    const catalogByName = new Map(catalogEntries.map((s) => [s.name, s]));

    const existing = await this.skillProgramMappingRepo.find();
    const existingKeys = new Set(existing.map((m) => `${m.skillId}:${m.programId}`));

    const toCreate: SkillProgramMapping[] = [];
    for (const skill of DEFAULT_SKILLS) {
      const catalogEntry = catalogByName.get(normalizeSkillName(skill.name));
      if (!catalogEntry) continue;

      const programIds = new Set<string>();
      for (const group of skill.groups) {
        for (const id of groupToProgramIds(group)) programIds.add(id);
      }
      for (const programId of programIds) {
        const key = `${catalogEntry.id}:${programId}`;
        if (!existingKeys.has(key)) {
          toCreate.push(this.skillProgramMappingRepo.create({ skillId: catalogEntry.id, programId }));
          existingKeys.add(key);
        }
      }
    }

    if (toCreate.length > 0) {
      this.logger.log(`Sincronizando ${toCreate.length} mapeos habilidad-programa faltantes`);
      await this.skillProgramMappingRepo.save(toCreate);
    }
  }

  // ─── Dashboard ──────────────────────────────────────────────────────────────

  async getDashboard(scope: DepartmentScope | null = null) {
    const scopedId = scope && !scope.all ? scope.departmentId : null;
    const supWhere = scopedId ? { isActive: true, programId: scopedId } : { isActive: true };
    const asgWhere = scopedId ? { status: AssignmentStatus.ACCEPTED, programId: scopedId } : { status: AssignmentStatus.ACCEPTED };
    const [
      pendingVerifications,
      activePrograms,
      activePeriods,
      totalSupervisors,
      activeAssignments,
    ] = await Promise.all([
      this.verificationRepo.count({ where: { action: VerificationAction.APPROVED } }),
      this.programRepo.count({ where: { isActive: true } }),
      this.periodRepo.count({ where: { status: PeriodStatus.ACTIVE } }),
      this.supervisorRepo.count({ where: supWhere }),
      this.assignmentRepo.count({ where: asgWhere }),
    ]);

    const currentPeriod = await this.periodRepo.findOne({
      where: { isCurrent: true },
    });

    return {
      stats: {
        pendingVerifications,
        activePrograms,
        activePeriods,
        totalSupervisors,
        activeAssignments,
        currentPeriod: currentPeriod?.name ?? null,
      },
    };
  }

  // ─── Academic Periods ────────────────────────────────────────────────────────

  async createPeriod(dto: CreateAcademicPeriodDto): Promise<AcademicPeriod> {
    const existing = await this.periodRepo.findOne({ where: { name: dto.name } });
    if (existing) {
      throw new ConflictException(`Ya existe un período con el nombre "${dto.name}"`);
    }

    const period = this.periodRepo.create(dto);
    const saved = await this.periodRepo.save(period);

    await this.eventPublisher.publish(
      'admin.period.created',
      { periodId: saved.id, name: saved.name, status: saved.status },
      'admin-service',
    );

    return saved;
  }

  async getPeriods(query: PeriodsQueryDto): Promise<{ data: AcademicPeriod[]; total: number; page: number; limit: number; totalPages: number }> {
    const { page = 1, limit = 20, status, isCurrent } = query;
    const where: FindOptionsWhere<AcademicPeriod> = {};

    if (status !== undefined) where.status = status;
    if (isCurrent !== undefined) where.isCurrent = isCurrent;

    const [data, total] = await this.periodRepo.findAndCount({
      where,
      order: { startDate: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getPeriodById(id: string): Promise<AcademicPeriod> {
    const period = await this.periodRepo.findOne({ where: { id } });
    if (!period) throw new NotFoundException('Período académico no encontrado');
    return period;
  }

  async updatePeriod(id: string, dto: UpdateAcademicPeriodDto): Promise<AcademicPeriod> {
    const period = await this.getPeriodById(id);

    if (dto.isCurrent === true) {
      // Unset current from all others
      await this.periodRepo.update({ isCurrent: true }, { isCurrent: false });
    }

    Object.assign(period, dto);
    return this.periodRepo.save(period);
  }

  // ─── Academic Programs ───────────────────────────────────────────────────────

  async createProgram(dto: CreateAcademicProgramDto): Promise<AcademicProgram> {
    const existing = await this.programRepo.findOne({ where: { code: dto.code } });
    if (existing) {
      throw new ConflictException(`Ya existe un programa con el código "${dto.code}"`);
    }

    const program = this.programRepo.create(dto);
    return this.programRepo.save(program);
  }

  async getPrograms(isActive?: boolean): Promise<AcademicProgram[]> {
    const where: FindOptionsWhere<AcademicProgram> = {};
    if (isActive !== undefined) where.isActive = isActive;
    return this.programRepo.find({ where, order: { name: 'ASC' } });
  }

  /** Uso interno cross-service: resuelve IDs de programa a {id, name, code}. */
  async getProgramsByIds(ids: string[]): Promise<{ id: string; name: string; code: string }[]> {
    if (!ids.length) return [];
    const programs = await this.programRepo.find({ where: { id: In(ids) } });
    return programs.map((p) => ({ id: p.id, name: p.name, code: p.code }));
  }

  async getProgramById(id: string): Promise<AcademicProgram> {
    const program = await this.programRepo.findOne({ where: { id } });
    if (!program) throw new NotFoundException('Programa académico no encontrado');
    return program;
  }

  async updateProgram(id: string, dto: UpdateAcademicProgramDto): Promise<AcademicProgram> {
    const program = await this.getProgramById(id);

    if (dto.code && dto.code !== program.code) {
      const conflict = await this.programRepo.findOne({ where: { code: dto.code } });
      if (conflict) throw new ConflictException(`El código "${dto.code}" ya está en uso`);
    }

    Object.assign(program, dto);
    return this.programRepo.save(program);
  }

  // ─── Company Verifications ────────────────────────────────────────────────────

  async verifyCompany(adminId: string, dto: VerifyCompanyDto): Promise<CompanyVerification> {
    const verification = this.verificationRepo.create({
      companyId: dto.companyId,
      verifiedBy: adminId,
      action: dto.action,
      previousStatus: dto.previousStatus,
      newStatus: dto.newStatus ?? dto.action,
      reason: dto.reason,
      documentsReviewed: dto.documentsReviewed,
      notes: dto.notes,
    });

    const saved = await this.verificationRepo.save(verification);

    await this.eventPublisher.publish(
      'admin.company.verified',
      {
        verificationId: saved.id,
        companyId: saved.companyId,
        action: saved.action,
        verifiedBy: saved.verifiedBy,
      },
      'admin-service',
    );

    return saved;
  }

  async getCompanyVerifications(
    companyId?: string,
    page = 1,
    limit = 20,
  ): Promise<{ data: CompanyVerification[]; total: number; page: number; limit: number; totalPages: number }> {
    const where: FindOptionsWhere<CompanyVerification> = {};
    if (companyId) where.companyId = companyId;

    const [data, total] = await this.verificationRepo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  // ─── Supervisors ──────────────────────────────────────────────────────────────

  async createSupervisor(dto: CreateSupervisorDto, scope: DepartmentScope | null = null): Promise<Supervisor> {
    const existing = await this.supervisorRepo.findOne({ where: { userId: dto.userId } });
    if (existing) throw new ConflictException('El usuario ya tiene un perfil de supervisor');

    // Admin de departamento: el docente queda siempre en SU departamento. Superadmin elige (o lo deja sin asignar).
    const programId = scope && !scope.all ? scope.departmentId : dto.programId;
    if (programId) await this.assertActiveProgram(programId);

    const supervisor = this.supervisorRepo.create({ ...dto, programId: programId ?? null });
    return this.supervisorRepo.save(supervisor);
  }

  /**
   * Docentes. Admin de departamento: por defecto solo los de su departamento; con
   * `includeOtherDepartments` ve también los de otros (marcados `crossDepartment`, para asignar
   * con aviso de "otro departamento"). Superadmin: todos.
   */
  async getSupervisors(
    isActive?: boolean,
    onboardingComplete?: boolean,
    scope: DepartmentScope | null = null,
    includeOtherDepartments = false,
  ): Promise<any[]> {
    const where: FindOptionsWhere<Supervisor> = {};
    if (isActive !== undefined) where.isActive = isActive;
    if (onboardingComplete !== undefined) where.isOnboardingComplete = onboardingComplete;
    if (scope && !scope.all && !includeOtherDepartments) where.programId = scope.departmentId;
    const supervisors = await this.supervisorRepo.find({ where, order: { createdAt: 'DESC' } });

    if (!supervisors.length) return [];

    const userIds = supervisors.map((s) => s.userId);
    let userProfiles: { userId: string; firstName: string; lastName: string }[] = [];
    try {
      userProfiles = await this.httpClient.post<{ userId: string; firstName: string; lastName: string }[]>(
        'user',
        '/internal/users/batch-basic',
        { userIds },
      );
    } catch (err) {
      this.logger.warn(`No se pudo obtener nombres de supervisores: ${err.message}`);
    }
    const userMap = new Map(userProfiles.map((u) => [u.userId, u]));

    return supervisors.map((s) => {
      const user = userMap.get(s.userId);
      return {
        ...s,
        firstName: user?.firstName ?? null,
        lastName: user?.lastName ?? null,
        fullName: user ? `${user.firstName} ${user.lastName}` : null,
        crossDepartment: !!scope && !scope.all && s.programId !== scope.departmentId,
      };
    });
  }

  async getSupervisorById(id: string): Promise<Supervisor> {
    const supervisor = await this.supervisorRepo.findOne({ where: { id } });
    if (!supervisor) throw new NotFoundException('Supervisor no encontrado');
    return supervisor;
  }

  /**
   * Asigna asesor (queda pendiente de aceptación) y, opcionalmente, jurados de anteproyecto
   * (se auto-aceptan). La lógica vive en AssignmentWorkflowService: validación previa completa,
   * una sola transacción, reutilización de asignaciones terminales y respuesta `{ created, skipped }`.
   * El proyecto/postulación NO inician aquí — solo cuando el asesor acepta (ver acceptAssignment).
   */
  assignSupervisor(adminId: string, dto: AssignSupervisorDto, scope: DepartmentScope | null = null): Promise<AssignmentResult> {
    return this.assignments.assignSupervisor(adminId, dto, scope);
  }

  /** Asigna jurado(s) final (auto-aceptados). Ver AssignmentWorkflowService. */
  assignJurado(adminId: string, dto: AssignJuradoDto, scope: DepartmentScope | null = null): Promise<AssignmentResult> {
    return this.assignments.assignJurado(adminId, dto, scope);
  }

  /** El asesor acepta su asignación — recién aquí el proyecto y la postulación pasan a in_progress. */
  async acceptAssignment(assignmentId: string, facultyUserId: string): Promise<SupervisorAssignment> {
    const assignment = await this.getOwnedAssignment(assignmentId, facultyUserId);

    if (assignment.role !== AssignmentRole.ASESOR) {
      throw new BadRequestException('Solo el asesor debe aceptar explícitamente su asignación');
    }
    if (assignment.status !== AssignmentStatus.PENDING_ACCEPTANCE) {
      throw new BadRequestException(`No se puede aceptar una asignación en estado "${assignment.status}"`);
    }

    assignment.status = AssignmentStatus.ACCEPTED;
    assignment.acceptedAt = new Date();
    const saved = await this.assignmentRepo.save(assignment);

    await this.recordAssignmentHistory(saved.id, AssignmentHistoryAction.ACCEPTED, facultyUserId);

    // Recién ahora se dispara el inicio real del proyecto/postulación.
    this.httpClient
      .patch('application', `/internal/applications/${saved.applicationId}/start-progress`, {
        supervisorAssignmentId: saved.id,
      })
      .catch((err) => this.logger.warn(`No se pudo iniciar postulación ${saved.applicationId}: ${err.message}`));
    this.httpClient
      .patch('project', `/internal/projects/${saved.projectId}/start-progress`, {})
      .catch((err) => this.logger.warn(`No se pudo iniciar proyecto ${saved.projectId}: ${err.message}`));

    await this.eventPublisher.publish(
      'admin.supervisor.accepted',
      {
        assignmentId: saved.id,
        supervisorId: saved.supervisorId,
        supervisorUserId: facultyUserId,
        studentId: saved.studentId,
        projectId: saved.projectId,
        applicationId: saved.applicationId,
        assignedBy: saved.assignedBy,
      },
      'admin-service',
    );

    return saved;
  }

  /** El asesor declina — el admin queda notificado para reasignar. */
  async declineAssignment(
    assignmentId: string,
    facultyUserId: string,
    dto: DeclineAssignmentDto,
  ): Promise<SupervisorAssignment> {
    const assignment = await this.getOwnedAssignment(assignmentId, facultyUserId);

    if (assignment.role !== AssignmentRole.ASESOR) {
      throw new BadRequestException('Solo el asesor puede declinar su asignación — los jurados no pueden rechazar');
    }
    if (assignment.status !== AssignmentStatus.PENDING_ACCEPTANCE) {
      throw new BadRequestException(`No se puede declinar una asignación en estado "${assignment.status}"`);
    }

    assignment.status = AssignmentStatus.DECLINED;
    assignment.declinedAt = new Date();
    assignment.declineReason = dto.reason;
    const saved = await this.assignmentRepo.save(assignment);

    await this.supervisorRepo.decrement({ id: saved.supervisorId }, 'currentStudents', 1);
    await this.recordAssignmentHistory(saved.id, AssignmentHistoryAction.DECLINED, facultyUserId, saved.supervisorId, null, dto.reason);

    await this.httpClient
      .patch('application', `/internal/applications/${saved.applicationId}/revert-accepted`, {})
      .catch((err) => this.logger.warn(
        `No se pudo revertir a accepted la postulación ${saved.applicationId}: ${err.message}`,
      ));

    await this.eventPublisher.publish(
      'admin.supervisor.declined',
      {
        assignmentId: saved.id,
        supervisorId: saved.supervisorId,
        supervisorUserId: facultyUserId,
        studentId: saved.studentId,
        projectId: saved.projectId,
        applicationId: saved.applicationId,
        assignedBy: saved.assignedBy,
        reason: dto.reason,
      },
      'admin-service',
    );

    return saved;
  }

  /** El admin reemplaza al asesor (por ejemplo, tras una solicitud de cambio del estudiante). */
  replaceAssignment(assignmentId: string, adminId: string, dto: ReplaceAssignmentDto, scope: DepartmentScope | null = null): Promise<SupervisorAssignment> {
    return this.assignments.replaceAssignment(assignmentId, adminId, dto, scope);
  }

  /** Desvincula a un jurado al completar su fase (p. ej. anteproyecto aprobado). */
  async disconnectAssignment(assignmentId: string, adminId: string, scope: DepartmentScope | null = null): Promise<SupervisorAssignment> {
    const assignment = await this.assignmentRepo.findOne({ where: { id: assignmentId } });
    if (!assignment) throw new NotFoundException('Asignación no encontrada');
    assertInScope(scope, assignment.programId, 'Asignación no encontrada');
    if (assignment.role === AssignmentRole.ASESOR) {
      throw new BadRequestException('El asesor no se desvincula — usa replaceAssignment');
    }

    assignment.status = AssignmentStatus.DISCONNECTED;
    assignment.disconnectedAt = new Date();
    const saved = await this.assignmentRepo.save(assignment);

    await this.recordAssignmentHistory(saved.id, AssignmentHistoryAction.DISCONNECTED, adminId, saved.supervisorId);

    await this.eventPublisher.publish(
      'admin.jurado.disconnected',
      { assignmentId: saved.id, supervisorId: saved.supervisorId, projectId: saved.projectId },
      'admin-service',
    );

    return saved;
  }

  async getAssignmentHistory(assignmentId: string, scope: DepartmentScope | null = null): Promise<SupervisorAssignmentHistory[]> {
    if (scope && !scope.all) {
      const a = await this.assignmentRepo.findOne({ where: { id: assignmentId } });
      assertInScope(scope, a?.programId, 'Asignación no encontrada');
    }
    return this.historyRepo.find({ where: { assignmentId }, order: { createdAt: 'ASC' } });
  }

  /** Desvincula automáticamente a los jurados de anteproyecto de una aplicación (al aprobarse). */
  async autoDisconnectJuradosAnteproyecto(applicationId: string): Promise<void> {
    const jurados = await this.assignmentRepo.find({
      where: {
        applicationId,
        role: AssignmentRole.JURADO_ANTEPROYECTO,
        status: AssignmentStatus.ACCEPTED,
      },
    });

    for (const jurado of jurados) {
      jurado.status = AssignmentStatus.DISCONNECTED;
      jurado.disconnectedAt = new Date();
      await this.assignmentRepo.save(jurado);
      await this.recordAssignmentHistory(jurado.id, AssignmentHistoryAction.DISCONNECTED, jurado.assignedBy, jurado.supervisorId);

      await this.eventPublisher.publish(
        'admin.jurado.disconnected',
        { assignmentId: jurado.id, supervisorId: jurado.supervisorId, applicationId, reason: 'Anteproyecto aprobado' },
        'admin-service',
      );
    }
  }

  /** Uso interno cross-service (analytics): estadísticas de carga docente y tiempos de aceptación. */
  async getAssignmentStats(scope: DepartmentScope | null = null): Promise<{
    totalAssignments: number;
    byRole: Record<string, number>;
    byStatus: Record<string, number>;
    avgAcceptanceHours: number | null;
    supervisorWorkload: { supervisorId: string; supervisorName: string | null; activeCount: number }[];
  }> {
    const assignments = await this.assignmentRepo.find(
      scope && !scope.all ? { where: { programId: scope.departmentId } } : undefined,
    );

    const byRole: Record<string, number> = {};
    const byStatus: Record<string, number> = {};
    const acceptanceDurationsMs: number[] = [];
    const workloadMap = new Map<string, number>();

    for (const a of assignments) {
      byRole[a.role] = (byRole[a.role] ?? 0) + 1;
      byStatus[a.status] = (byStatus[a.status] ?? 0) + 1;

      if (a.role === AssignmentRole.ASESOR && a.acceptedAt) {
        const durationMs = new Date(a.acceptedAt).getTime() - new Date(a.createdAt).getTime();
        // Una duración negativa es causalmente imposible (no se puede aceptar antes de crear) —
        // señal de dato de seed inconsistente (created_at cayó en NOW() del insert en vez de una
        // fecha histórica coherente con accepted_at). Se excluye del promedio en vez de dejar que
        // corrompa la métrica con un número negativo sin sentido.
        if (durationMs >= 0) {
          acceptanceDurationsMs.push(durationMs);
        }
      }

      if (a.status === AssignmentStatus.ACCEPTED || a.status === AssignmentStatus.ACTIVE) {
        workloadMap.set(a.supervisorId, (workloadMap.get(a.supervisorId) ?? 0) + 1);
      }
    }

    const avgAcceptanceHours = acceptanceDurationsMs.length
      ? acceptanceDurationsMs.reduce((sum, ms) => sum + ms, 0) / acceptanceDurationsMs.length / 1000 / 60 / 60
      : null;

    // `supervisor_assignments.supervisor_id` referencia `Supervisor.id` (la PK interna de la tabla
    // "supervisors"), NO el userId directamente — hay que resolver primero id→userId contra la
    // propia tabla local antes de poder pedir el nombre a user-service (mismo patrón de dos saltos
    // que getSupervisors() ya usa, solo que ahí parte de una lista de Supervisor completa y acá solo
    // tenemos los ids sueltos del agrupamiento). Si algo falla se degrada a null, no rompe el endpoint.
    const supervisorIds = [...workloadMap.keys()];
    let supervisorNames = new Map<string, string>();
    if (supervisorIds.length > 0) {
      try {
        const supervisorRows = await this.supervisorRepo.find({ where: { id: In(supervisorIds) } });
        const idToUserId = new Map(supervisorRows.map((s) => [s.id, s.userId]));
        const userIds = supervisorRows.map((s) => s.userId);
        const profiles = userIds.length
          ? await this.httpClient.post<{ userId: string; firstName: string; lastName: string }[]>(
              'user',
              '/internal/users/batch-basic',
              { userIds },
            )
          : [];
        const userIdToName = new Map(profiles.map((u) => [u.userId, `${u.firstName} ${u.lastName}`.trim()]));
        for (const supervisorId of supervisorIds) {
          const userId = idToUserId.get(supervisorId);
          const name = userId ? userIdToName.get(userId) : undefined;
          if (name) supervisorNames.set(supervisorId, name);
        }
      } catch (err) {
        this.logger.warn(`No se pudieron obtener nombres de supervisores para el dashboard: ${err.message}`);
      }
    }

    return {
      totalAssignments: assignments.length,
      byRole,
      byStatus,
      avgAcceptanceHours: avgAcceptanceHours !== null ? Math.round(avgAcceptanceHours * 100) / 100 : null,
      supervisorWorkload: [...workloadMap.entries()].map(([supervisorId, activeCount]) => ({
        supervisorId,
        supervisorName: supervisorNames.get(supervisorId) ?? null,
        activeCount,
      })),
    };
  }

  /**
   * Uso interno cross-service: todas las asignaciones (activas o no) de un docente puntual, para
   * el reporte "Carga de Docente" de analytics-service. `supervisorId` es `Supervisor.id` (la PK
   * de la tabla local, no el userId — ver comentario en getAssignmentStats() sobre esa distinción).
   */
  async getAssignmentsBySupervisor(supervisorId: string): Promise<
    {
      id: string;
      studentId: string;
      projectId: string;
      role: AssignmentRole;
      status: AssignmentStatus;
      startDate: string;
      endDate: string | null;
      acceptedAt: Date | null;
    }[]
  > {
    const assignments = await this.assignmentRepo.find({
      where: { supervisorId },
      order: { createdAt: 'DESC' },
    });
    return assignments.map((a) => ({
      id: a.id,
      studentId: a.studentId,
      projectId: a.projectId,
      role: a.role,
      status: a.status,
      startDate: a.startDate,
      endDate: a.endDate ?? null,
      acceptedAt: a.acceptedAt,
    }));
  }

  /** Uso interno cross-service: resuelve el rol (asesor/jurado) de un docente sobre una aplicación. */
  async getAssignmentsByApplication(applicationId: string): Promise<
    { id: string; supervisorId: string; supervisorUserId: string; role: AssignmentRole; status: AssignmentStatus }[]
  > {
    const assignments = await this.assignmentRepo.find({
      where: { applicationId },
      relations: ['supervisor'],
    });

    return assignments.map((a) => ({
      id: a.id,
      supervisorId: a.supervisorId,
      supervisorUserId: a.supervisor?.userId,
      role: a.role,
      status: a.status,
    }));
  }

  private async getOwnedAssignment(assignmentId: string, facultyUserId: string): Promise<SupervisorAssignment> {
    const supervisor = await this.supervisorRepo.findOne({ where: { userId: facultyUserId } });
    if (!supervisor) throw new NotFoundException('Perfil de supervisor no encontrado');

    const assignment = await this.assignmentRepo.findOne({
      where: { id: assignmentId, supervisorId: supervisor.id },
    });
    if (!assignment) throw new NotFoundException('Asignación no encontrada');
    return assignment;
  }

  private async recordAssignmentHistory(
    assignmentId: string,
    action: AssignmentHistoryAction,
    performedBy: string,
    previousSupervisorId: string | null = null,
    newSupervisorId: string | null = null,
    reason: string | null = null,
  ): Promise<void> {
    await this.historyRepo.save(
      this.historyRepo.create({ assignmentId, action, performedBy, previousSupervisorId, newSupervisorId, reason }),
    );
  }

  async getMySupervisedStudents(
    supervisorUserId: string,
    status?: string,
    page = 1,
    limit = 20,
  ): Promise<{ data: SupervisorAssignment[]; total: number; page: number; limit: number; totalPages: number }> {
    const supervisor = await this.supervisorRepo.findOne({ where: { userId: supervisorUserId } });
    if (!supervisor) {
      return { data: [], total: 0, page, limit, totalPages: 0 };
    }

    const where: FindOptionsWhere<SupervisorAssignment> = { supervisorId: supervisor.id };
    if (status) where.status = status as AssignmentStatus;

    const [data, total] = await this.assignmentRepo.findAndCount({
      where,
      relations: ['supervisor', 'period'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getMySupervisedStudentsEnriched(
    supervisorUserId: string,
    status?: string,
    page = 1,
    limit = 20,
  ): Promise<{
    data: any[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const supervisor = await this.supervisorRepo.findOne({ where: { userId: supervisorUserId } });
    if (!supervisor) {
      return { data: [], total: 0, page, limit, totalPages: 0 };
    }

    const where: FindOptionsWhere<SupervisorAssignment> = { supervisorId: supervisor.id };
    if (status) where.status = status as AssignmentStatus;

    const [assignments, total] = await this.assignmentRepo.findAndCount({
      where,
      relations: ['supervisor', 'period'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    if (assignments.length === 0) {
      return { data: [], total, page, limit, totalPages: Math.ceil(total / limit) };
    }

    const studentIds = [...new Set(assignments.map(a => a.studentId))];
    const projectIds = [...new Set(assignments.map(a => a.projectId))];

    let studentProfiles: { userId: string; firstName: string; lastName: string; displayName?: string }[] = [];
    let projectData: { id: string; title: string; companyId: string }[] = [];

    await Promise.all([
      (async () => {
        try {
          studentProfiles = await this.httpClient.post<{ userId: string; firstName: string; lastName: string; displayName?: string }[]>(
            'user',
            '/internal/users/batch-basic',
            { userIds: studentIds },
          );
        } catch (err) {
          this.logger.warn(`No se pudo obtener perfiles de estudiantes: ${err.message}`);
        }
      })(),
      (async () => {
        try {
          projectData = await this.httpClient.post<{ id: string; title: string; companyId: string }[]>(
            'project',
            '/internal/projects/batch-basic',
            { projectIds },
          );
        } catch (err) {
          this.logger.warn(`No se pudo obtener datos de proyectos: ${err.message}`);
        }
      })(),
    ]);

    const studentMap = new Map(studentProfiles.map(u => [u.userId, u]));
    const projectMap = new Map(projectData.map(p => [p.id, p]));

    const companyIds = [...new Set(projectData.map(p => p.companyId))];
    const companyNames = new Map<string, string>();

    if (companyIds.length > 0) {
      await Promise.all(
        companyIds.map(async (companyUserId) => {
          try {
            const companyInfo = await this.httpClient.get<{ companyName: string }>(
              'company',
              `/internal/companies/${companyUserId}/basic-info`,
            );
            companyNames.set(companyUserId, companyInfo.companyName);
          } catch {
            companyNames.set(companyUserId, 'Empresa');
          }
        })
      );
    }

    const enriched = assignments.map(assignment => {
      const student = studentMap.get(assignment.studentId);
      const project = projectMap.get(assignment.projectId);
      const companyName = project ? (companyNames.get(project.companyId) ?? 'Empresa') : 'Empresa';

      const studentName = student
        ? (student.displayName ?? (`${student.firstName ?? ''} ${student.lastName ?? ''}`.trim() || 'Estudiante'))
        : 'Estudiante';

      return {
        ...assignment,
        studentName,
        studentCode: null,
        projectTitle: project?.title ?? 'Proyecto',
        companyName,
        status: assignment.status,
      };
    });

    return { data: enriched, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getAssignmentById(assignmentId: string, supervisorUserId: string): Promise<any> {
    const supervisor = await this.supervisorRepo.findOne({ where: { userId: supervisorUserId } });
    if (!supervisor) {
      throw new NotFoundException('Supervisor no encontrado');
    }

    const assignment = await this.assignmentRepo.findOne({
      where: { id: assignmentId, supervisorId: supervisor.id },
      relations: ['supervisor', 'period'],
    });

    if (!assignment) {
      throw new NotFoundException('Asignación no encontrada');
    }

    const [studentProfile, projectInfo] = await Promise.all([
      (async () => {
        try {
          const profiles = await this.httpClient.post<{ userId: string; firstName: string; lastName: string; displayName?: string }[]>(
            'user',
            '/internal/users/batch-basic',
            { userIds: [assignment.studentId] },
          );
          return profiles[0] ?? null;
        } catch {
          return null;
        }
      })(),
      (async () => {
        try {
          const projects = await this.httpClient.post<{ id: string; title: string; companyId: string }[]>(
            'project',
            '/internal/projects/batch-basic',
            { projectIds: [assignment.projectId] },
          );
          return projects[0] ?? null;
        } catch {
          return null;
        }
      })(),
    ]);

    let studentDetail: { program?: string; semester?: number } = {};
    try {
      const studentData = await this.httpClient.get<{ program?: string; semester?: number }>(
        'students',
        `/internal/students/${assignment.studentId}/matching-data`,
      );
      studentDetail = { program: studentData.program, semester: studentData.semester };
    } catch {
      // ignore
    }

    let companyName = 'Empresa';
    if (projectInfo?.companyId) {
      try {
        const companyInfo = await this.httpClient.get<{ companyName: string }>(
          'company',
          `/internal/companies/${projectInfo.companyId}/basic-info`,
        );
        companyName = companyInfo.companyName;
      } catch {
        // ignore
      }
    }

    const studentName = studentProfile
      ? (studentProfile.displayName ?? (`${studentProfile.firstName ?? ''} ${studentProfile.lastName ?? ''}`.trim() || 'Estudiante'))
      : 'Estudiante';

    return {
      ...assignment,
      studentName,
      studentCode: studentDetail.program ?? null,
      studentProgram: studentDetail.program ?? null,
      studentSemester: studentDetail.semester ?? null,
      projectTitle: projectInfo?.title ?? 'Proyecto',
      companyName,
      periodName: assignment.period?.name ?? null,
    };
  }

  async getMyProfile(supervisorUserId: string): Promise<Supervisor> {
    const supervisor = await this.supervisorRepo.findOne({ where: { userId: supervisorUserId } });
    if (!supervisor) {
      throw new NotFoundException('Perfil de supervisor no encontrado');
    }
    return supervisor;
  }

  async updateMyProfile(supervisorUserId: string, dto: UpdateSupervisorDto): Promise<Supervisor> {
    let supervisor = await this.supervisorRepo.findOne({ where: { userId: supervisorUserId } });

    if (!supervisor) {
      supervisor = this.supervisorRepo.create({ userId: supervisorUserId });
    }

    if (dto.programId) await this.assertActiveProgram(dto.programId);
    Object.assign(supervisor, dto);

    // Bug corregido: antes se calculaba isOnboardingReady pero nunca se persistía
    // en el perfil, por lo que el docente nunca aparecía como "listo" para
    // recibir asignaciones aunque hubiera completado su onboarding.
    const isOnboardingReady = !!(supervisor.employeeCode && supervisor.department && supervisor.role && supervisor.programId);
    supervisor.isOnboardingComplete = isOnboardingReady;

    const saved = await this.supervisorRepo.save(supervisor);

    await this.eventPublisher.publish(
      'faculty.profile.updated',
      {
        userId: supervisorUserId,
        supervisorId: supervisor.id,
        isOnboardingReady,
      },
      'admin-service',
    );

    return saved;
  }

  // ─── System Settings ──────────────────────────────────────────────────────────

  async upsertSetting(adminId: string, dto: UpdateSystemSettingDto): Promise<SystemSetting> {
    let setting = await this.settingRepo.findOne({ where: { key: dto.key } });

    if (setting) {
      setting.value = dto.value;
      setting.updatedBy = adminId;
      if (dto.description !== undefined) setting.description = dto.description;
      if (dto.category !== undefined) setting.category = dto.category;
    } else {
      setting = this.settingRepo.create({
        key: dto.key,
        value: dto.value,
        description: dto.description,
        category: dto.category,
        updatedBy: adminId,
      });
    }

    return this.settingRepo.save(setting);
  }

  async getSettings(category?: string): Promise<SystemSetting[]> {
    const where: FindOptionsWhere<SystemSetting> = {};
    if (category) where.category = category;
    return this.settingRepo.find({ where, order: { key: 'ASC' } });
  }

  async getSettingByKey(key: string): Promise<SystemSetting> {
    const setting = await this.settingRepo.findOne({ where: { key } });
    if (!setting) throw new NotFoundException(`Configuración "${key}" no encontrada`);
    return setting;
  }

  // ─── Categorías de rechazo de proyectos ───────────────────────────────────────

  async getRejectionCategories(onlyActive = false): Promise<ProjectRejectionCategory[]> {
    const where: FindOptionsWhere<ProjectRejectionCategory> = onlyActive ? { isActive: true } : {};
    return this.rejectionCategoryRepo.find({ where, order: { displayOrder: 'ASC', name: 'ASC' } });
  }

  async createRejectionCategory(dto: CreateRejectionCategoryDto): Promise<ProjectRejectionCategory> {
    const category = this.rejectionCategoryRepo.create({
      name: dto.name,
      description: dto.description ?? null,
      isActive: dto.isActive ?? true,
      displayOrder: dto.displayOrder ?? 0,
    });
    return this.rejectionCategoryRepo.save(category);
  }

  async updateRejectionCategory(id: string, dto: UpdateRejectionCategoryDto): Promise<ProjectRejectionCategory> {
    const category = await this.rejectionCategoryRepo.findOne({ where: { id } });
    if (!category) throw new NotFoundException(`Categoría de rechazo ${id} no encontrada`);
    Object.assign(category, dto);
    return this.rejectionCategoryRepo.save(category);
  }

  // ─── Plantillas académicas ─────────────────────────────────────────────────────

  async createTemplate(adminId: string, dto: CreateAcademicTemplateDto, scope: DepartmentScope | null = null): Promise<AcademicTemplate> {
    const program = await this.scopeProgram(scope);
    if (program && dto.programCode !== program.code) {
      throw new ForbiddenException('Solo puedes registrar plantillas de tu propio departamento.');
    }
    const template = this.templateRepo.create({ ...dto, createdBy: adminId });
    return this.templateRepo.save(template);
  }

  async getTemplates(programCode?: string, type?: string, onlyActive = false, scope: DepartmentScope | null = null): Promise<AcademicTemplate[]> {
    const where: FindOptionsWhere<AcademicTemplate> = {};
    const program = await this.scopeProgram(scope);
    if (program) where.programCode = program.code;
    else if (programCode) where.programCode = programCode;
    if (type) where.type = type as any;
    if (onlyActive) where.isActive = true;
    return this.templateRepo.find({ where, order: { programCode: 'ASC', type: 'ASC' } });
  }

  async getTemplateById(id: string, scope: DepartmentScope | null = null): Promise<AcademicTemplate> {
    const template = await this.templateRepo.findOne({ where: { id } });
    if (!template) throw new NotFoundException('Plantilla no encontrada');
    const program = await this.scopeProgram(scope);
    if (program && template.programCode !== program.code) throw new NotFoundException('Plantilla no encontrada');
    return template;
  }

  async updateTemplate(id: string, dto: UpdateAcademicTemplateDto, scope: DepartmentScope | null = null): Promise<AcademicTemplate> {
    const template = await this.getTemplateById(id, scope);
    Object.assign(template, dto);
    return this.templateRepo.save(template);
  }

  // ─── Documentos requeridos ──────────────────────────────────────────────────────

  async createDocumentRequirement(adminId: string, dto: CreateDocumentRequirementDto, scope: DepartmentScope | null = null): Promise<DocumentRequirement> {
    // Admin de departamento: siempre para su departamento. Superadmin: global (sin programId) o de un departamento.
    const programId = scope && !scope.all ? scope.departmentId : dto.programId ?? null;
    if (programId) await this.assertActiveProgram(programId);
    const requirement = this.documentRequirementRepo.create({
      ...dto,
      programId,
      projectTypes: dto.projectTypes ?? ['all'],
      createdBy: adminId,
    });
    return this.documentRequirementRepo.save(requirement);
  }

  async getDocumentRequirements(filters?: {
    actorType?: string;
    requiredAtStage?: string;
    projectType?: string;
    onlyActive?: boolean;
  }, scope: DepartmentScope | null = null): Promise<DocumentRequirement[]> {
    const where: FindOptionsWhere<DocumentRequirement> = {};
    if (filters?.actorType) where.actorType = filters.actorType as any;
    if (filters?.requiredAtStage) where.requiredAtStage = filters.requiredAtStage as any;
    if (filters?.onlyActive) where.isActive = true;

    // Admin de departamento: los requisitos globales (solo lectura) + los de su departamento.
    const requirements = await this.documentRequirementRepo.find({
      where: scope && !scope.all
        ? [{ ...where, programId: IsNull() }, { ...where, programId: scope.departmentId }]
        : where,
      order: { displayOrder: 'ASC', name: 'ASC' },
    });

    const projectType = filters?.projectType;
    if (!projectType) return requirements;

    return requirements.filter(
      (r) => r.projectTypes.includes('all') || r.projectTypes.includes(projectType),
    );
  }

  async getDocumentRequirementById(id: string, scope: DepartmentScope | null = null): Promise<DocumentRequirement> {
    const requirement = await this.documentRequirementRepo.findOne({ where: { id } });
    if (!requirement) throw new NotFoundException('Documento requerido no encontrado');
    // Visible: global o de su departamento.
    if (scope && !scope.all && requirement.programId && requirement.programId !== scope.departmentId) {
      throw new NotFoundException('Documento requerido no encontrado');
    }
    return requirement;
  }

  async updateDocumentRequirement(id: string, dto: UpdateDocumentRequirementDto, scope: DepartmentScope | null = null): Promise<DocumentRequirement> {
    const requirement = await this.getDocumentRequirementById(id, scope);
    if (scope && !scope.all) {
      if (!requirement.programId) {
        throw new ForbiddenException('Este requisito es global de la Facultad: solo el administrador de Facultad puede modificarlo.');
      }
      delete (dto as { programId?: string }).programId; // no se puede mover a otro departamento
    } else if (dto.programId) {
      await this.assertActiveProgram(dto.programId);
    }
    Object.assign(requirement, dto);
    return this.documentRequirementRepo.save(requirement);
  }

  // ─── Catálogo de habilidades ────────────────────────────────────────────────────

  async createSkill(adminId: string, dto: CreateSkillCatalogDto, scope: DepartmentScope | null = null): Promise<SkillCatalog> {
    // Admin de departamento: la habilidad nace asociada solo a su departamento.
    if (scope && !scope.all) {
      await this.scopeProgram(scope);
      dto = { ...dto, programIds: [scope.departmentId] };
    }
    const normalized = normalizeSkillName(dto.displayName);
    const existing = await this.skillCatalogRepo.findOne({ where: { name: normalized } });
    if (existing) {
      throw new ConflictException(`Ya existe una habilidad "${dto.displayName}" en el catálogo`);
    }

    const skill = this.skillCatalogRepo.create({
      name: normalized,
      displayName: dto.displayName,
      category: dto.category,
      createdBy: adminId,
    });
    const saved = await this.skillCatalogRepo.save(skill);

    if (dto.programIds?.length) {
      const mappings = dto.programIds.map((programId) =>
        this.skillProgramMappingRepo.create({ skillId: saved.id, programId }),
      );
      await this.skillProgramMappingRepo.save(mappings);
    }

    return saved;
  }

  async getSkills(filters: {
    programId?: string;
    category?: SkillCategory;
    search?: string;
    onlyActive?: boolean;
  }, scope: DepartmentScope | null = null): Promise<SkillCatalog[]> {
    // Admin de departamento: el catálogo de su departamento (no puede pedir el de otro).
    if (scope && !scope.all) filters = { ...filters, programId: scope.departmentId };
    const where: FindOptionsWhere<SkillCatalog> = {};
    if (filters.category) where.category = filters.category;
    if (filters.onlyActive) where.isActive = true;
    if (filters.search) where.displayName = ILike(`%${filters.search}%`);

    let skills = await this.skillCatalogRepo.find({ where, order: { displayName: 'ASC' } });

    if (filters.programId) {
      const mappings = await this.skillProgramMappingRepo.find({ where: { programId: filters.programId } });
      const mappedIds = new Set(mappings.map((m) => m.skillId));
      // Las habilidades blandas (soft_skill) se muestran siempre, sin necesidad de asociación explícita.
      skills = skills.filter((s) => s.category === SkillCategory.SOFT_SKILL || mappedIds.has(s.id));
    }

    // Admin de departamento: se anota si puede editarla (exclusiva de su departamento) o solo desvincularla (compartida/blanda).
    if (scope && !scope.all) {
      const mappings = await this.skillProgramMappingRepo.find({ where: { skillId: In(skills.map((s) => s.id)) } });
      const bySkill = new Map<string, string[]>();
      for (const m of mappings) bySkill.set(m.skillId, [...(bySkill.get(m.skillId) ?? []), m.programId]);
      return skills.map((sk) => {
        const ids = bySkill.get(sk.id) ?? [];
        return Object.assign(sk, {
          programIds: ids,
          shared: ids.length > 1,
          editableByDepartment: ids.length === 1 && ids[0] === scope.departmentId,
        });
      });
    }

    return skills;
  }

  async getSkillById(id: string): Promise<SkillCatalog> {
    const skill = await this.skillCatalogRepo.findOne({ where: { id } });
    if (!skill) throw new NotFoundException('Habilidad no encontrada en el catálogo');
    return skill;
  }

  async updateSkill(id: string, dto: UpdateSkillCatalogDto, scope: DepartmentScope | null = null): Promise<SkillCatalog> {
    const skill = await this.getSkillById(id);
    await this.assertSkillEditable(skill.id, scope);

    if (dto.displayName) {
      const normalized = normalizeSkillName(dto.displayName);
      if (normalized !== skill.name) {
        const conflict = await this.skillCatalogRepo.findOne({ where: { name: normalized } });
        if (conflict && conflict.id !== id) {
          throw new ConflictException(`Ya existe una habilidad "${dto.displayName}" en el catálogo`);
        }
        skill.name = normalized;
      }
      skill.displayName = dto.displayName;
    }
    if (dto.category) skill.category = dto.category;
    if (dto.isActive !== undefined) skill.isActive = dto.isActive;

    return this.skillCatalogRepo.save(skill);
  }

  /** Desactiva la habilidad (soft-delete) — permanece válida para datos ya asignados. */
  async deactivateSkill(id: string, scope: DepartmentScope | null = null): Promise<SkillCatalog> {
    const skill = await this.getSkillById(id);
    await this.assertSkillEditable(skill.id, scope);
    skill.isActive = false;
    return this.skillCatalogRepo.save(skill);
  }

  /**
   * Admin de departamento: solo edita/desactiva habilidades EXCLUSIVAS de su departamento.
   * Una compartida (o sin asociación, p. ej. blanda general) solo la edita la Facultad; el departamento puede desvincularla.
   */
  private async assertSkillEditable(skillId: string, scope: DepartmentScope | null): Promise<void> {
    if (!scope || scope.all) return;
    const mappings = await this.skillProgramMappingRepo.find({ where: { skillId } });
    if (!mappings.some((m) => m.programId === scope.departmentId)) {
      throw new NotFoundException('Habilidad no encontrada en el catálogo');
    }
    if (mappings.length > 1) {
      throw new ForbiddenException('Esta habilidad es compartida con otros departamentos: solo el administrador de Facultad puede editarla. Puedes desvincularla de tu departamento.');
    }
  }

  async getSkillsByProgram(programId: string): Promise<SkillCatalog[]> {
    return this.getSkills({ programId, onlyActive: true });
  }

  async associateSkillPrograms(skillId: string, programIds: string[], scope: DepartmentScope | null = null): Promise<SkillProgramMapping[]> {
    await this.getSkillById(skillId);
    if (scope && !scope.all && programIds.some((id) => id !== scope.departmentId)) {
      throw new ForbiddenException('Solo puedes asociar habilidades a tu propio departamento.');
    }

    const existing = await this.skillProgramMappingRepo.find({ where: { skillId } });
    const existingProgramIds = new Set(existing.map((m) => m.programId));
    const toCreate = programIds.filter((id) => !existingProgramIds.has(id));

    if (toCreate.length) {
      const mappings = toCreate.map((programId) => this.skillProgramMappingRepo.create({ skillId, programId }));
      await this.skillProgramMappingRepo.save(mappings);
    }

    return this.skillProgramMappingRepo.find({ where: { skillId } });
  }

  async disassociateSkillProgram(skillId: string, programId: string, scope: DepartmentScope | null = null): Promise<void> {
    if (scope && !scope.all) {
      if (programId !== scope.departmentId) {
        throw new ForbiddenException('Solo puedes desvincular habilidades de tu propio departamento.');
      }
      // Desvincular la ÚNICA asociación dejaría la habilidad huérfana: para eso existe "desactivar".
      const mappings = await this.skillProgramMappingRepo.find({ where: { skillId } });
      if (mappings.length <= 1) {
        throw new ConflictException('Es una habilidad exclusiva de tu departamento: desactívala en lugar de desvincularla.');
      }
    }
    await this.skillProgramMappingRepo.delete({ skillId, programId });
  }

  /** Uso interno cross-service: catálogo completo con sus programas asociados. */
  async getInternalSkillCatalog(): Promise<
    { id: string; name: string; displayName: string; category: SkillCategory; programIds: string[] }[]
  > {
    const [skills, mappings] = await Promise.all([
      this.skillCatalogRepo.find({ where: { isActive: true } }),
      this.skillProgramMappingRepo.find(),
    ]);

    const programsBySkill = new Map<string, string[]>();
    for (const m of mappings) {
      const arr = programsBySkill.get(m.skillId) ?? [];
      arr.push(m.programId);
      programsBySkill.set(m.skillId, arr);
    }

    return skills.map((s) => ({
      id: s.id,
      name: s.name,
      displayName: s.displayName,
      category: s.category,
      programIds: programsBySkill.get(s.id) ?? [],
    }));
  }

  /** Uso interno cross-service: resuelve nombres libres contra el catálogo por nombre normalizado. */
  async resolveSkillsByNames(
    names: string[],
  ): Promise<{ name: string; skillId: string | null; category: SkillCategory | null; displayName: string | null }[]> {
    const skills = await this.skillCatalogRepo.find({ where: { isActive: true } });
    const byName = new Map(skills.map((s) => [s.name, s]));

    return names.map((original) => {
      const match = byName.get(normalizeSkillName(original));
      return {
        name: original,
        skillId: match?.id ?? null,
        category: match?.category ?? null,
        displayName: match?.displayName ?? null,
      };
    });
  }
}

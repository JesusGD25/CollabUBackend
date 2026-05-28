import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere, IsNull } from 'typeorm';
import { EventPublisher, MicroserviceHttpClient } from '@collab-u/shared';

import { AcademicPeriod, PeriodStatus } from './entities/academic-period.entity';
import { AcademicProgram } from './entities/academic-program.entity';
import { CompanyVerification, VerificationAction } from './entities/company-verification.entity';
import { Supervisor } from './entities/supervisor.entity';
import { SupervisorAssignment } from './entities/supervisor-assignment.entity';
import { SystemSetting } from './entities/system-setting.entity';

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
} from './dto';

@Injectable()
export class AdminService {
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

    private readonly eventPublisher: EventPublisher,
    private readonly httpClient: MicroserviceHttpClient,
  ) {}

  // ─── Dashboard ──────────────────────────────────────────────────────────────

  async getDashboard() {
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
      this.supervisorRepo.count({ where: { isActive: true } }),
      this.assignmentRepo.count({ where: { status: 'active' } }),
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

  async createSupervisor(dto: CreateSupervisorDto): Promise<Supervisor> {
    const existing = await this.supervisorRepo.findOne({ where: { userId: dto.userId } });
    if (existing) throw new ConflictException('El usuario ya tiene un perfil de supervisor');

    const supervisor = this.supervisorRepo.create(dto);
    return this.supervisorRepo.save(supervisor);
  }

  async getSupervisors(isActive?: boolean): Promise<any[]> {
    const where: FindOptionsWhere<Supervisor> = {};
    if (isActive !== undefined) where.isActive = isActive;
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
      };
    });
  }

  async getSupervisorById(id: string): Promise<Supervisor> {
    const supervisor = await this.supervisorRepo.findOne({ where: { id } });
    if (!supervisor) throw new NotFoundException('Supervisor no encontrado');
    return supervisor;
  }

  async assignSupervisor(adminId: string, dto: AssignSupervisorDto): Promise<SupervisorAssignment> {
    const supervisor = await this.getSupervisorById(dto.supervisorId);

    if (!supervisor.isActive) {
      throw new BadRequestException('El supervisor no está activo');
    }

    if (supervisor.currentStudents >= supervisor.maxStudents) {
      throw new BadRequestException('El supervisor ha alcanzado su límite de estudiantes');
    }

    // Check for duplicate
    const existing = await this.assignmentRepo.findOne({
      where: { studentId: dto.studentId, projectId: dto.projectId },
    });
    if (existing) throw new ConflictException('El estudiante ya tiene un supervisor asignado para este proyecto');

    const assignment = this.assignmentRepo.create({
      ...dto,
      assignedBy: adminId,
      status: 'active',
    });

    const saved = await this.assignmentRepo.save(assignment);

    // Update supervisor student count
    await this.supervisorRepo.increment({ id: dto.supervisorId }, 'currentStudents', 1);

    // Notify application-service to start IN_PROGRESS
    this.httpClient
      .patch('application', `/internal/applications/${dto.applicationId}/start-progress`, {})
      .catch((err) => this.logger.warn(`No se pudo iniciar postulación ${dto.applicationId}: ${err.message}`));

    // Notify project-service to start IN_PROGRESS
    this.httpClient
      .patch('project', `/internal/projects/${dto.projectId}/start-progress`, {})
      .catch((err) => this.logger.warn(`No se pudo iniciar proyecto ${dto.projectId}: ${err.message}`));

    await this.eventPublisher.publish(
      'admin.supervisor.assigned',
      {
        assignmentId: saved.id,
        supervisorId: saved.supervisorId,
        studentId: saved.studentId,
        projectId: saved.projectId,
        assignedBy: saved.assignedBy,
      },
      'admin-service',
    );

    return saved;
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
    if (status) where.status = status;

    const [data, total] = await this.assignmentRepo.findAndCount({
      where,
      relations: ['supervisor', 'period'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
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
}

import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventPublisher, MicroserviceHttpClient } from '@collab-u/shared';

import { StudentProfile } from './entities/student-profile.entity';
import { Skill } from './entities/skill.entity';
import { Experience } from './entities/experience.entity';
import { Education } from './entities/education.entity';
import { Certification } from './entities/certification.entity';
import { Language } from './entities/language.entity';
import { Interest } from './entities/interest.entity';

import { CreateStudentProfileDto } from './dto/create-student-profile.dto';
import { UpdateStudentProfileDto } from './dto/update-student-profile.dto';
import { CreateSkillDto } from './dto/create-skill.dto';
import { UpdateSkillDto } from './dto/update-skill.dto';
import { CreateExperienceDto } from './dto/create-experience.dto';
import { UpdateExperienceDto } from './dto/update-experience.dto';
import { CreateEducationDto } from './dto/create-education.dto';
import { UpdateEducationDto } from './dto/update-education.dto';
import { CreateCertificationDto } from './dto/create-certification.dto';
import { UpdateCertificationDto } from './dto/update-certification.dto';
import { CreateLanguageDto } from './dto/create-language.dto';
import { UpdateLanguageDto } from './dto/update-language.dto';
import { CreateInterestDto } from './dto/create-interest.dto';
import { UpdateInterestDto } from './dto/update-interest.dto';
import { StudentSearchQueryDto } from './dto/student-search-query.dto';
import { PaginatedStudentsResponseDto } from './dto/paginated-students-response.dto';

@Injectable()
export class StudentService {
  private readonly logger = new Logger(StudentService.name);

  constructor(
    @InjectRepository(StudentProfile) private profileRepo: Repository<StudentProfile>,
    @InjectRepository(Skill) private skillRepo: Repository<Skill>,
    @InjectRepository(Experience) private experienceRepo: Repository<Experience>,
    @InjectRepository(Education) private educationRepo: Repository<Education>,
    @InjectRepository(Certification) private certRepo: Repository<Certification>,
    @InjectRepository(Language) private languageRepo: Repository<Language>,
    @InjectRepository(Interest) private interestRepo: Repository<Interest>,
    private readonly eventPublisher: EventPublisher,
    private readonly httpClient: MicroserviceHttpClient,
  ) {}

  // ── PERFIL ──

  async createProfile(dto: CreateStudentProfileDto): Promise<StudentProfile> {
    const existing = await this.profileRepo.findOne({ where: { userId: dto.userId } });
    if (existing) {
      throw new ConflictException('Ya existe un perfil de estudiante para este usuario');
    }

    const profile = this.profileRepo.create({
      userId: dto.userId,
      program: dto.program,
      faculty: dto.faculty || 'Facultad de Ingeniería',
      semester: dto.semester,
      studentCode: dto.studentCode,
      enrollmentYear: dto.enrollmentYear,
      expectedGraduationYear: dto.expectedGraduationYear,
      gpa: dto.gpa,
      totalCreditsCompleted: dto.totalCreditsCompleted || 0,
      totalCreditsRequired: dto.totalCreditsRequired,
      bio: dto.bio,
      headline: dto.headline,
      availability: dto.availability,
      preferredWorkMode: dto.preferredWorkMode,
      availableHoursPerWeek: dto.availableHoursPerWeek,
      willingToRelocate: dto.willingToRelocate || false,
    });

    const saved = await this.profileRepo.save(profile);
    saved.profileCompleteness = this.calculateProfileCompleteness(saved);
    await this.profileRepo.save(saved);

    const createdProfile = await this.getProfile(saved.userId);

    await this.eventPublisher.publish('student.profile.created', {
      userId: createdProfile.userId,
      studentId: createdProfile.id,
      program: createdProfile.program,
      semester: createdProfile.semester,
      profileCompleteness: createdProfile.profileCompleteness,
      isOnboardingReady: this.isOnboardingReady(createdProfile),
    }, 'student-service');

    this.logger.log(`Perfil de estudiante creado: ${saved.id} para usuario ${saved.userId}`);
    return createdProfile;
  }

  async getProfile(userId: string): Promise<StudentProfile> {
    const profile = await this.profileRepo.findOne({
      where: { userId },
      relations: ['skills', 'experiences', 'education', 'certifications', 'languages', 'interests'],
    });
    if (!profile) {
      throw new NotFoundException('Perfil de estudiante no encontrado');
    }
    return profile;
  }

  async getProfileById(studentUserId: string): Promise<StudentProfile> {
    const profile = await this.profileRepo.findOne({
      where: { userId: studentUserId },
      relations: ['skills', 'experiences', 'education', 'certifications', 'languages', 'interests'],
    });
    if (!profile) {
      throw new NotFoundException('Perfil de estudiante no encontrado');
    }
    return profile;
  }

  async updateProfile(userId: string, dto: UpdateStudentProfileDto): Promise<StudentProfile> {
    const profile = await this.getProfile(userId);
    Object.assign(profile, dto);

    const saved = await this.profileRepo.save(profile);
    saved.profileCompleteness = this.calculateProfileCompleteness(saved);
    await this.profileRepo.save(saved);

    const updatedProfile = await this.getProfile(userId);
    await this.publishProfileUpdated(updatedProfile);

    return updatedProfile;
  }

  async searchStudents(query: StudentSearchQueryDto): Promise<PaginatedStudentsResponseDto> {
    const qb = this.profileRepo.createQueryBuilder('student');
    qb.where('student.isVisible = :visible', { visible: true });

    if (query.search) {
      qb.andWhere(
        '(student.program ILIKE :search OR student.headline ILIKE :search OR student.bio ILIKE :search)',
        { search: `%${query.search}%` },
      );
    }

    if (query.program) {
      qb.andWhere('student.program = :program', { program: query.program });
    }

    if (query.minSemester) {
      qb.andWhere('student.semester >= :minSemester', { minSemester: query.minSemester });
    }

    if (query.maxSemester) {
      qb.andWhere('student.semester <= :maxSemester', { maxSemester: query.maxSemester });
    }

    if (query.availability) {
      qb.andWhere('student.availability = :availability', { availability: query.availability });
    }

    if (query.minGpa) {
      qb.andWhere('student.gpa >= :minGpa', { minGpa: query.minGpa });
    }

    if (query.minRating) {
      qb.andWhere('student.averageRating >= :minRating', { minRating: query.minRating });
    }

    if (query.skills && query.skills.length > 0) {
      qb.leftJoin('student.skills', 'skill');
      qb.andWhere('skill.name IN (:...skillNames)', { skillNames: query.skills });
    }

    if (query.skillCategory) {
      if (!query.skills || query.skills.length === 0) {
        qb.leftJoin('student.skills', 'skill');
      }
      qb.andWhere('skill.category = :skillCategory', { skillCategory: query.skillCategory });
    }

    const allowedSortFields = ['createdAt', 'semester', 'gpa', 'averageRating', 'profileCompleteness'];
    const sortBy = query.sortBy && allowedSortFields.includes(query.sortBy) ? `student.${query.sortBy}` : 'student.createdAt';
    const sortOrder = query.sortOrder === 'ASC' ? 'ASC' : 'DESC';
    qb.orderBy(sortBy, sortOrder);

    const page = query.page || 1;
    const limit = query.limit || 20;
    qb.skip((page - 1) * limit).take(limit);

    const [data, total] = await qb.getManyAndCount();

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // ── SKILLS ──

  async getSkills(userId: string): Promise<Skill[]> {
    const profile = await this.findProfileByUserId(userId);
    return this.skillRepo.find({
      where: { studentId: profile.id },
      order: { displayOrder: 'ASC', createdAt: 'DESC' },
    });
  }

  /** Resuelve nombres de habilidad contra el catálogo maestro (admin-service) por nombre normalizado. */
  private async resolveCatalogSkillIds(names: string[]): Promise<Map<string, string | null>> {
    if (!names.length) return new Map();
    try {
      const results = await this.httpClient.post<{ name: string; skillId: string | null }[]>(
        'admin',
        '/internal/admin/skills/by-names',
        { names },
      );
      return new Map(results.map((r) => [r.name, r.skillId]));
    } catch (err) {
      this.logger.warn(`No se pudo resolver catálogo de habilidades: ${err.message}`);
      return new Map();
    }
  }

  async addSkill(userId: string, dto: CreateSkillDto): Promise<Skill> {
    const profile = await this.findProfileByUserId(userId);
    let catalogSkillId = dto.catalogSkillId ?? null;
    if (!catalogSkillId) {
      const resolved = await this.resolveCatalogSkillIds([dto.name]);
      catalogSkillId = resolved.get(dto.name) ?? null;
    }
    const skill = this.skillRepo.create({ ...dto, catalogSkillId, studentId: profile.id });
    const saved = await this.skillRepo.save(skill);
    await this.recalculateCompleteness(userId);
    return saved;
  }

  async updateSkill(userId: string, skillId: string, dto: UpdateSkillDto): Promise<Skill> {
    const profile = await this.findProfileByUserId(userId);
    const skill = await this.skillRepo.findOne({ where: { id: skillId, studentId: profile.id } });
    if (!skill) {
      throw new NotFoundException('Habilidad no encontrada');
    }
    if (dto.name && dto.name !== skill.name) {
      const resolved = await this.resolveCatalogSkillIds([dto.name]);
      skill.catalogSkillId = resolved.get(dto.name) ?? null;
    }
    Object.assign(skill, dto);
    return this.skillRepo.save(skill);
  }

  async deleteSkill(userId: string, skillId: string): Promise<void> {
    const profile = await this.findProfileByUserId(userId);
    const skill = await this.skillRepo.findOne({ where: { id: skillId, studentId: profile.id } });
    if (!skill) {
      throw new NotFoundException('Habilidad no encontrada');
    }
    await this.skillRepo.remove(skill);
    await this.recalculateCompleteness(userId);
  }

  async addSkillsBatch(userId: string, dtos: CreateSkillDto[]): Promise<Skill[]> {
    const profile = await this.findProfileByUserId(userId);
    const namesToResolve = dtos.filter((d) => !d.catalogSkillId).map((d) => d.name);
    const resolved = await this.resolveCatalogSkillIds(namesToResolve);
    const skills = dtos.map((dto) =>
      this.skillRepo.create({
        ...dto,
        catalogSkillId: dto.catalogSkillId ?? resolved.get(dto.name) ?? null,
        studentId: profile.id,
      }),
    );
    const saved = await this.skillRepo.save(skills);
    await this.recalculateCompleteness(userId);
    return saved;
  }

  // ── EXPERIENCIAS ──

  async getExperiences(userId: string): Promise<Experience[]> {
    const profile = await this.findProfileByUserId(userId);
    return this.experienceRepo.find({
      where: { studentId: profile.id },
      order: { displayOrder: 'ASC', startDate: 'DESC' },
    });
  }

  async addExperience(userId: string, dto: CreateExperienceDto): Promise<Experience> {
    const profile = await this.findProfileByUserId(userId);
    const experience = this.experienceRepo.create({ ...dto, studentId: profile.id });
    const saved = await this.experienceRepo.save(experience);
    await this.recalculateCompleteness(userId);
    return saved;
  }

  async updateExperience(userId: string, expId: string, dto: UpdateExperienceDto): Promise<Experience> {
    const profile = await this.findProfileByUserId(userId);
    const experience = await this.experienceRepo.findOne({ where: { id: expId, studentId: profile.id } });
    if (!experience) {
      throw new NotFoundException('Experiencia no encontrada');
    }
    Object.assign(experience, dto);
    return this.experienceRepo.save(experience);
  }

  async deleteExperience(userId: string, expId: string): Promise<void> {
    const profile = await this.findProfileByUserId(userId);
    const experience = await this.experienceRepo.findOne({ where: { id: expId, studentId: profile.id } });
    if (!experience) {
      throw new NotFoundException('Experiencia no encontrada');
    }
    await this.experienceRepo.remove(experience);
    await this.recalculateCompleteness(userId);
  }

  // ── EDUCACIÓN ──

  async getEducation(userId: string): Promise<Education[]> {
    const profile = await this.findProfileByUserId(userId);
    return this.educationRepo.find({
      where: { studentId: profile.id },
      order: { displayOrder: 'ASC', startDate: 'DESC' },
    });
  }

  async addEducation(userId: string, dto: CreateEducationDto): Promise<Education> {
    const profile = await this.findProfileByUserId(userId);
    const education = this.educationRepo.create({ ...dto, studentId: profile.id });
    const saved = await this.educationRepo.save(education);
    await this.recalculateCompleteness(userId);
    return saved;
  }

  async updateEducation(userId: string, eduId: string, dto: UpdateEducationDto): Promise<Education> {
    const profile = await this.findProfileByUserId(userId);
    const education = await this.educationRepo.findOne({ where: { id: eduId, studentId: profile.id } });
    if (!education) {
      throw new NotFoundException('Educación no encontrada');
    }
    Object.assign(education, dto);
    return this.educationRepo.save(education);
  }

  async deleteEducation(userId: string, eduId: string): Promise<void> {
    const profile = await this.findProfileByUserId(userId);
    const education = await this.educationRepo.findOne({ where: { id: eduId, studentId: profile.id } });
    if (!education) {
      throw new NotFoundException('Educación no encontrada');
    }
    await this.educationRepo.remove(education);
    await this.recalculateCompleteness(userId);
  }

  // ── CERTIFICACIONES ──

  async getCertifications(userId: string): Promise<Certification[]> {
    const profile = await this.findProfileByUserId(userId);
    return this.certRepo.find({
      where: { studentId: profile.id },
      order: { displayOrder: 'ASC', issueDate: 'DESC' },
    });
  }

  async addCertification(userId: string, dto: CreateCertificationDto): Promise<Certification> {
    const profile = await this.findProfileByUserId(userId);
    const certification = this.certRepo.create({ ...dto, studentId: profile.id });
    return this.certRepo.save(certification);
  }

  async updateCertification(userId: string, certId: string, dto: UpdateCertificationDto): Promise<Certification> {
    const profile = await this.findProfileByUserId(userId);
    const certification = await this.certRepo.findOne({ where: { id: certId, studentId: profile.id } });
    if (!certification) {
      throw new NotFoundException('Certificación no encontrada');
    }
    Object.assign(certification, dto);
    return this.certRepo.save(certification);
  }

  async deleteCertification(userId: string, certId: string): Promise<void> {
    const profile = await this.findProfileByUserId(userId);
    const certification = await this.certRepo.findOne({ where: { id: certId, studentId: profile.id } });
    if (!certification) {
      throw new NotFoundException('Certificación no encontrada');
    }
    await this.certRepo.remove(certification);
  }

  // ── IDIOMAS ──

  async getLanguages(userId: string): Promise<Language[]> {
    const profile = await this.findProfileByUserId(userId);
    return this.languageRepo.find({
      where: { studentId: profile.id },
      order: { displayOrder: 'ASC' },
    });
  }

  async addLanguage(userId: string, dto: CreateLanguageDto): Promise<Language> {
    const profile = await this.findProfileByUserId(userId);
    const language = this.languageRepo.create({ ...dto, studentId: profile.id });
    const saved = await this.languageRepo.save(language);
    await this.recalculateCompleteness(userId);
    return saved;
  }

  async updateLanguage(userId: string, langId: string, dto: UpdateLanguageDto): Promise<Language> {
    const profile = await this.findProfileByUserId(userId);
    const language = await this.languageRepo.findOne({ where: { id: langId, studentId: profile.id } });
    if (!language) {
      throw new NotFoundException('Idioma no encontrado');
    }
    Object.assign(language, dto);
    return this.languageRepo.save(language);
  }

  async deleteLanguage(userId: string, langId: string): Promise<void> {
    const profile = await this.findProfileByUserId(userId);
    const language = await this.languageRepo.findOne({ where: { id: langId, studentId: profile.id } });
    if (!language) {
      throw new NotFoundException('Idioma no encontrado');
    }
    await this.languageRepo.remove(language);
    await this.recalculateCompleteness(userId);
  }

  // ── INTERESES ──

  async getInterests(userId: string): Promise<Interest[]> {
    const profile = await this.findProfileByUserId(userId);
    return this.interestRepo.find({
      where: { studentId: profile.id },
      order: { displayOrder: 'ASC', priority: 'DESC' },
    });
  }

  async addInterest(userId: string, dto: CreateInterestDto): Promise<Interest> {
    const profile = await this.findProfileByUserId(userId);
    const interest = this.interestRepo.create({ ...dto, studentId: profile.id });
    const saved = await this.interestRepo.save(interest);
    await this.recalculateCompleteness(userId);
    return saved;
  }

  async updateInterest(userId: string, intId: string, dto: UpdateInterestDto): Promise<Interest> {
    const profile = await this.findProfileByUserId(userId);
    const interest = await this.interestRepo.findOne({ where: { id: intId, studentId: profile.id } });
    if (!interest) {
      throw new NotFoundException('Interés no encontrado');
    }
    Object.assign(interest, dto);
    return this.interestRepo.save(interest);
  }

  async deleteInterest(userId: string, intId: string): Promise<void> {
    const profile = await this.findProfileByUserId(userId);
    const interest = await this.interestRepo.findOne({ where: { id: intId, studentId: profile.id } });
    if (!interest) {
      throw new NotFoundException('Interés no encontrado');
    }
    await this.interestRepo.remove(interest);
    await this.recalculateCompleteness(userId);
  }

  // ── INTER-SERVICIO ──

  async getMatchingData(studentUserId: string) {
    const profile = await this.profileRepo.findOne({
      where: { userId: studentUserId },
      relations: ['skills', 'languages', 'experiences'],
    });
    if (!profile) {
      throw new NotFoundException('Perfil de estudiante no encontrado');
    }
    return {
      studentId: profile.id,
      userId: profile.userId,
      program: profile.program,
      semester: profile.semester,
      availability: profile.availability,
      skills: (profile.skills || []).map((s) => ({
        name: s.name,
        catalogSkillId: s.catalogSkillId,
        category: s.category,
        proficiencyLevel: s.proficiencyLevel,
      })),
      languages: (profile.languages || []).map((l) => ({
        language: l.language,
        proficiency: l.proficiency,
      })),
      experiences: (profile.experiences || []).map((e) => ({
        type: e.type,
        yearsEquivalent: e.endDate
          ? Math.round(
              (new Date(e.endDate).getTime() - new Date(e.startDate).getTime()) /
                (1000 * 60 * 60 * 24 * 365) * 10,
            ) / 10
          : Math.round(
              (Date.now() - new Date(e.startDate).getTime()) /
                (1000 * 60 * 60 * 24 * 365) * 10,
            ) / 10,
      })),
    };
  }

  async updateRating(studentUserId: string, averageRating: number, totalRatings: number): Promise<void> {
    const profile = await this.profileRepo.findOne({ where: { userId: studentUserId } });
    if (!profile) {
      throw new NotFoundException('Perfil de estudiante no encontrado');
    }
    profile.averageRating = averageRating;
    profile.totalRatings = totalRatings;
    await this.profileRepo.save(profile);
  }

  // ── UTILIDADES PRIVADAS ──

  private async findProfileByUserId(userId: string): Promise<StudentProfile> {
    const profile = await this.profileRepo.findOne({ where: { userId } });
    if (!profile) {
      throw new NotFoundException('Perfil de estudiante no encontrado');
    }
    return profile;
  }

  private calculateProfileCompleteness(profile: StudentProfile): number {
    let score = 0;
    if (profile.program) score += 10;
    if (profile.semester) score += 10;
    if (profile.bio) score += 10;
    if (profile.skills && profile.skills.length > 0) score += 15;
    if (profile.experiences && profile.experiences.length > 0) score += 15;
    if (profile.education && profile.education.length > 0) score += 15;
    if (profile.cvUrl) score += 10;
    if (profile.languages && profile.languages.length > 0) score += 10;
    if (profile.interests && profile.interests.length > 0) score += 5;
    return score;
  }

  private isOnboardingReady(profile: StudentProfile): boolean {
    const hasProgram = !!profile.program?.trim();
    const hasSemester = !!profile.semester;
    const hasStudentCode = !!profile.studentCode?.trim();
    const hasBio = !!profile.bio?.trim();
    const hasSkill = (profile.skills?.length ?? 0) > 0;

    return hasProgram && hasSemester && hasStudentCode && hasBio && hasSkill;
  }

  private async publishProfileUpdated(profile: StudentProfile): Promise<void> {
    await this.eventPublisher.publish(
      'student.profile.updated',
      {
        userId: profile.userId,
        studentId: profile.id,
        profileCompleteness: profile.profileCompleteness,
        isOnboardingReady: this.isOnboardingReady(profile),
      },
      'student-service',
    );
  }

  private async recalculateCompleteness(userId: string): Promise<void> {
    const profile = await this.profileRepo.findOne({
      where: { userId },
      relations: ['skills', 'experiences', 'education', 'languages', 'interests'],
    });
    if (profile) {
      profile.profileCompleteness = this.calculateProfileCompleteness(profile);
      await this.profileRepo.save(profile);
      await this.publishProfileUpdated(profile);
    }
  }
}

import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventPublisher } from '@collab-u/shared';

import { CompanyProfile, VerificationStatus } from './entities/company-profile.entity';
import { CompanyLocation } from './entities/company-location.entity';
import { CompanyContact } from './entities/company-contact.entity';
import { BusinessArea } from './entities/business-area.entity';

import {
  CreateCompanyProfileDto,
  UpdateCompanyProfileDto,
  CreateLocationDto,
  UpdateLocationDto,
  CreateContactDto,
  UpdateContactDto,
  CreateBusinessAreaDto,
  CompanySearchQueryDto,
} from './dto';

export interface PaginatedCompaniesResponse {
  data: CompanyProfile[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class CompanyService {
  private readonly logger = new Logger(CompanyService.name);

  constructor(
    @InjectRepository(CompanyProfile) private profileRepo: Repository<CompanyProfile>,
    @InjectRepository(CompanyLocation) private locationRepo: Repository<CompanyLocation>,
    @InjectRepository(CompanyContact) private contactRepo: Repository<CompanyContact>,
    @InjectRepository(BusinessArea) private areaRepo: Repository<BusinessArea>,
    private readonly eventPublisher: EventPublisher,
  ) {}

  // ── PERFIL ──

  async createProfile(dto: CreateCompanyProfileDto): Promise<CompanyProfile> {
    const existing = await this.profileRepo.findOne({ where: { userId: dto.userId } });
    if (existing) {
      throw new ConflictException('Ya existe un perfil de empresa para este usuario');
    }

    const profile = this.profileRepo.create({
      userId: dto.userId,
      companyName: dto.companyName,
      legalName: dto.legalName,
      nit: dto.nit,
      industry: dto.industry,
      companySize: dto.companySize,
      description: dto.description,
      website: dto.website,
      foundedYear: dto.foundedYear,
      headquartersCity: dto.headquartersCity,
      headquartersState: dto.headquartersState,
      employeeCount: dto.employeeCount,
    });

    const saved = await this.profileRepo.save(profile);
    saved.profileCompleteness = this.calculateProfileCompleteness(saved);
    await this.profileRepo.save(saved);

    await this.eventPublisher.publish('company.profile.created', {
      userId: saved.userId,
      companyId: saved.id,
      companyName: saved.companyName,
    }, 'company-service');

    this.logger.log(`Perfil de empresa creado: ${saved.id} para usuario ${saved.userId}`);
    return saved;
  }

  async getProfile(userId: string): Promise<CompanyProfile> {
    const profile = await this.profileRepo.findOne({
      where: { userId },
      relations: ['locations', 'contacts', 'businessAreas'],
    });
    if (!profile) {
      throw new NotFoundException('Perfil de empresa no encontrado');
    }
    return profile;
  }

  async getProfileById(companyUserId: string): Promise<CompanyProfile> {
    const profile = await this.profileRepo.findOne({
      where: { userId: companyUserId },
      relations: ['locations', 'contacts', 'businessAreas'],
    });
    if (!profile) {
      throw new NotFoundException('Perfil de empresa no encontrado');
    }
    return profile;
  }

  async updateProfile(userId: string, dto: UpdateCompanyProfileDto): Promise<CompanyProfile> {
    const profile = await this.getProfile(userId);
    Object.assign(profile, dto);

    const saved = await this.profileRepo.save(profile);
    saved.profileCompleteness = this.calculateProfileCompleteness(saved);
    await this.profileRepo.save(saved);

    await this.eventPublisher.publish('company.profile.updated', {
      userId: saved.userId,
      companyId: saved.id,
    }, 'company-service');

    return this.getProfile(userId);
  }

  async searchCompanies(query: CompanySearchQueryDto): Promise<PaginatedCompaniesResponse> {
    const qb = this.profileRepo.createQueryBuilder('company');
    qb.where('company.isActive = :active', { active: true });

    if (query.search) {
      qb.andWhere(
        '(company.companyName ILIKE :search OR company.description ILIKE :search OR company.industry ILIKE :search)',
        { search: `%${query.search}%` },
      );
    }

    if (query.industry) {
      qb.andWhere('company.industry = :industry', { industry: query.industry });
    }

    if (query.companySize) {
      qb.andWhere('company.companySize = :companySize', { companySize: query.companySize });
    }

    if (query.verificationStatus) {
      qb.andWhere('company.verificationStatus = :verificationStatus', {
        verificationStatus: query.verificationStatus,
      });
    }

    if (query.city) {
      qb.andWhere('company.headquartersCity ILIKE :city', { city: `%${query.city}%` });
    }

    if (query.verified !== undefined) {
      qb.andWhere('company.verificationStatus = :vStatus', {
        vStatus: query.verified ? VerificationStatus.VERIFIED : VerificationStatus.PENDING,
      });
    }

    const allowedSortFields = ['companyName', 'createdAt', 'rating'];
    const sortBy = query.sortBy && allowedSortFields.includes(query.sortBy)
      ? `company.${query.sortBy}` : 'company.createdAt';
    const sortOrder = query.sortOrder === 'ASC' ? 'ASC' : 'DESC';
    qb.orderBy(sortBy, sortOrder);

    const page = query.page || 1;
    const limit = query.limit || 10;
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

  // ── UBICACIONES ──

  async getLocations(userId: string): Promise<CompanyLocation[]> {
    const profile = await this.findProfileByUserId(userId);
    return this.locationRepo.find({
      where: { companyId: profile.id },
      order: { isHeadquarters: 'DESC', createdAt: 'DESC' },
    });
  }

  async addLocation(userId: string, dto: CreateLocationDto): Promise<CompanyLocation> {
    const profile = await this.findProfileByUserId(userId);
    const location = this.locationRepo.create({ ...dto, companyId: profile.id });
    const saved = await this.locationRepo.save(location);
    await this.recalculateCompleteness(userId);
    return saved;
  }

  async updateLocation(userId: string, locationId: string, dto: UpdateLocationDto): Promise<CompanyLocation> {
    const profile = await this.findProfileByUserId(userId);
    const location = await this.locationRepo.findOne({ where: { id: locationId, companyId: profile.id } });
    if (!location) {
      throw new NotFoundException('Ubicación no encontrada');
    }
    Object.assign(location, dto);
    return this.locationRepo.save(location);
  }

  async deleteLocation(userId: string, locationId: string): Promise<void> {
    const profile = await this.findProfileByUserId(userId);
    const location = await this.locationRepo.findOne({ where: { id: locationId, companyId: profile.id } });
    if (!location) {
      throw new NotFoundException('Ubicación no encontrada');
    }
    await this.locationRepo.remove(location);
    await this.recalculateCompleteness(userId);
  }

  // ── CONTACTOS ──

  async getContacts(userId: string): Promise<CompanyContact[]> {
    const profile = await this.findProfileByUserId(userId);
    return this.contactRepo.find({
      where: { companyId: profile.id },
      order: { isPrimary: 'DESC', createdAt: 'DESC' },
    });
  }

  async addContact(userId: string, dto: CreateContactDto): Promise<CompanyContact> {
    const profile = await this.findProfileByUserId(userId);
    const contact = this.contactRepo.create({ ...dto, companyId: profile.id });
    const saved = await this.contactRepo.save(contact);
    await this.recalculateCompleteness(userId);
    return saved;
  }

  async updateContact(userId: string, contactId: string, dto: UpdateContactDto): Promise<CompanyContact> {
    const profile = await this.findProfileByUserId(userId);
    const contact = await this.contactRepo.findOne({ where: { id: contactId, companyId: profile.id } });
    if (!contact) {
      throw new NotFoundException('Contacto no encontrado');
    }
    Object.assign(contact, dto);
    return this.contactRepo.save(contact);
  }

  async deleteContact(userId: string, contactId: string): Promise<void> {
    const profile = await this.findProfileByUserId(userId);
    const contact = await this.contactRepo.findOne({ where: { id: contactId, companyId: profile.id } });
    if (!contact) {
      throw new NotFoundException('Contacto no encontrado');
    }
    await this.contactRepo.remove(contact);
    await this.recalculateCompleteness(userId);
  }

  // ── ÁREAS DE NEGOCIO ──

  async getBusinessAreas(userId: string): Promise<BusinessArea[]> {
    const profile = await this.findProfileByUserId(userId);
    return this.areaRepo.find({
      where: { companyId: profile.id },
      order: { displayOrder: 'ASC', createdAt: 'DESC' },
    });
  }

  async addBusinessArea(userId: string, dto: CreateBusinessAreaDto): Promise<BusinessArea> {
    const profile = await this.findProfileByUserId(userId);
    const area = this.areaRepo.create({ ...dto, companyId: profile.id });
    const saved = await this.areaRepo.save(area);
    await this.recalculateCompleteness(userId);
    return saved;
  }

  async deleteBusinessArea(userId: string, areaId: string): Promise<void> {
    const profile = await this.findProfileByUserId(userId);
    const area = await this.areaRepo.findOne({ where: { id: areaId, companyId: profile.id } });
    if (!area) {
      throw new NotFoundException('Área de negocio no encontrada');
    }
    await this.areaRepo.remove(area);
    await this.recalculateCompleteness(userId);
  }

  // ── INTER-SERVICIO ──

  async getBasicInfo(companyUserId: string) {
    const profile = await this.profileRepo.findOne({
      where: { userId: companyUserId },
      relations: ['locations', 'businessAreas'],
    });
    if (!profile) {
      throw new NotFoundException('Perfil de empresa no encontrado');
    }
    return {
      companyId: profile.id,
      companyName: profile.companyName,
      industry: profile.industry,
      companySize: profile.companySize,
      verificationStatus: profile.verificationStatus,
      rating: profile.rating,
      headquartersCity: profile.headquartersCity,
      locations: (profile.locations || []).map((l) => ({
        city: l.city,
        state: l.state,
        country: l.country,
      })),
      businessAreas: (profile.businessAreas || []).map((a) => a.areaName),
    };
  }

  async exists(companyUserId: string): Promise<boolean> {
    const profile = await this.profileRepo.findOne({ where: { userId: companyUserId } });
    return !!profile;
  }

  async updateVerificationStatus(userId: string, status: VerificationStatus): Promise<void> {
    const profile = await this.profileRepo.findOne({ where: { userId } });
    if (!profile) {
      throw new NotFoundException('Perfil de empresa no encontrado');
    }
    profile.verificationStatus = status;
    await this.profileRepo.save(profile);

    await this.eventPublisher.publish('company.verification.updated', {
      userId: profile.userId,
      companyId: profile.id,
      verificationStatus: status,
    }, 'company-service');
  }

  async updateRating(companyUserId: string, rating: number, totalReviews: number): Promise<void> {
    const profile = await this.profileRepo.findOne({ where: { userId: companyUserId } });
    if (!profile) {
      throw new NotFoundException('Perfil de empresa no encontrado');
    }
    profile.rating = rating;
    profile.totalReviews = totalReviews;
    await this.profileRepo.save(profile);
  }

  // ── UTILIDADES PRIVADAS ──

  private async findProfileByUserId(userId: string): Promise<CompanyProfile> {
    const profile = await this.profileRepo.findOne({ where: { userId } });
    if (!profile) {
      throw new NotFoundException('Perfil de empresa no encontrado');
    }
    return profile;
  }

  private calculateProfileCompleteness(profile: CompanyProfile): number {
    let score = 0;
    if (profile.companyName) score += 10;
    if (profile.legalName) score += 5;
    if (profile.nit) score += 5;
    if (profile.industry) score += 10;
    if (profile.companySize) score += 5;
    if (profile.description) score += 15;
    if (profile.website) score += 5;
    if (profile.logoUrl) score += 5;
    if (profile.headquartersCity) score += 10;
    if (profile.locations && profile.locations.length > 0) score += 10;
    if (profile.contacts && profile.contacts.length > 0) score += 10;
    if (profile.businessAreas && profile.businessAreas.length > 0) score += 10;
    return score;
  }

  private async recalculateCompleteness(userId: string): Promise<void> {
    const profile = await this.profileRepo.findOne({
      where: { userId },
      relations: ['locations', 'contacts', 'businessAreas'],
    });
    if (profile) {
      profile.profileCompleteness = this.calculateProfileCompleteness(profile);
      await this.profileRepo.save(profile);
    }
  }
}

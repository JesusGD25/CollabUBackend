import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';

import { EventPublisher } from '@collab-u/shared';

import { CompanyService } from './company.service';
import { CompanyProfile, CompanySize, VerificationStatus } from './entities/company-profile.entity';
import { CompanyLocation } from './entities/company-location.entity';
import { CompanyContact } from './entities/company-contact.entity';
import { BusinessArea } from './entities/business-area.entity';

// ─── Mocks ──────────────────────────────────────────────────────────

const mockEventPublisher = {
  publish: jest.fn().mockResolvedValue(undefined),
};

const createMockRepo = () => ({
  findOne: jest.fn(),
  find: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  remove: jest.fn(),
  createQueryBuilder: jest.fn(),
});

// ─── Helpers ────────────────────────────────────────────────────────

function createMockProfile(overrides: Partial<CompanyProfile> = {}): CompanyProfile {
  return {
    id: 'company-uuid-1',
    userId: 'user-uuid-1',
    companyName: 'Tech Solutions SAS',
    legalName: null,
    nit: null,
    industry: null,
    companySize: null,
    description: null,
    website: null,
    logoUrl: null,
    foundedYear: null,
    headquartersCity: null,
    headquartersState: null,
    employeeCount: null,
    verificationStatus: VerificationStatus.PENDING,
    rating: 0,
    totalReviews: 0,
    totalProjects: 0,
    profileCompleteness: 10,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    locations: [],
    contacts: [],
    businessAreas: [],
    ...overrides,
  } as CompanyProfile;
}

function createMockLocation(overrides: Partial<CompanyLocation> = {}): CompanyLocation {
  return {
    id: 'location-uuid-1',
    companyId: 'company-uuid-1',
    name: 'Oficina principal',
    address: 'Calle 18 #25-32',
    city: 'Pasto',
    state: 'Nariño',
    country: 'Colombia',
    postalCode: '520001',
    latitude: null,
    longitude: null,
    isHeadquarters: true,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    company: null,
    ...overrides,
  } as CompanyLocation;
}

function createMockContact(overrides: Partial<CompanyContact> = {}): CompanyContact {
  return {
    id: 'contact-uuid-1',
    companyId: 'company-uuid-1',
    firstName: 'Carlos',
    lastName: 'Rodríguez',
    position: 'Director de RRHH',
    email: 'carlos@techsolutions.com',
    phone: '+57 3001234567',
    isPrimary: true,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    company: null,
    ...overrides,
  } as CompanyContact;
}

function createMockArea(overrides: Partial<BusinessArea> = {}): BusinessArea {
  return {
    id: 'area-uuid-1',
    companyId: 'company-uuid-1',
    areaName: 'Desarrollo Web',
    description: 'Desarrollo de aplicaciones web modernas',
    displayOrder: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    company: null,
    ...overrides,
  } as BusinessArea;
}

// ─── Test Suite ─────────────────────────────────────────────────────

describe('CompanyService', () => {
  let service: CompanyService;
  let profileRepo: any;
  let locationRepo: any;
  let contactRepo: any;
  let areaRepo: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CompanyService,
        { provide: getRepositoryToken(CompanyProfile), useFactory: createMockRepo },
        { provide: getRepositoryToken(CompanyLocation), useFactory: createMockRepo },
        { provide: getRepositoryToken(CompanyContact), useFactory: createMockRepo },
        { provide: getRepositoryToken(BusinessArea), useFactory: createMockRepo },
        { provide: EventPublisher, useValue: mockEventPublisher },
      ],
    }).compile();

    service = module.get<CompanyService>(CompanyService);
    profileRepo = module.get(getRepositoryToken(CompanyProfile));
    locationRepo = module.get(getRepositoryToken(CompanyLocation));
    contactRepo = module.get(getRepositoryToken(CompanyContact));
    areaRepo = module.get(getRepositoryToken(BusinessArea));
  });

  afterEach(() => jest.clearAllMocks());

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ═══════════════════════════════════════════════════════════════════
  // CREATE PROFILE
  // ═══════════════════════════════════════════════════════════════════
  describe('createProfile', () => {
    const dto = { userId: 'user-uuid-1', companyName: 'Tech Solutions SAS' };

    it('debería crear un perfil de empresa', async () => {
      const profile = createMockProfile();
      profileRepo.findOne.mockResolvedValueOnce(null);
      profileRepo.create.mockReturnValue(profile);
      profileRepo.save.mockResolvedValue(profile);

      const result = await service.createProfile(dto);

      expect(result).toBeDefined();
      expect(profileRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ userId: dto.userId, companyName: dto.companyName }),
      );
      expect(mockEventPublisher.publish).toHaveBeenCalledWith(
        'company.profile.created',
        expect.objectContaining({ userId: 'user-uuid-1' }),
        'company-service',
      );
    });

    it('debería lanzar ConflictException si el perfil ya existe', async () => {
      profileRepo.findOne.mockResolvedValue(createMockProfile());

      await expect(service.createProfile(dto)).rejects.toThrow(ConflictException);
      expect(profileRepo.save).not.toHaveBeenCalled();
    });

    it('debería calcular profileCompleteness al crear', async () => {
      const profile = createMockProfile();
      profileRepo.findOne.mockResolvedValueOnce(null);
      profileRepo.create.mockReturnValue(profile);
      profileRepo.save.mockResolvedValue(profile);

      await service.createProfile(dto);

      expect(profileRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ profileCompleteness: expect.any(Number) }),
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // GET PROFILE
  // ═══════════════════════════════════════════════════════════════════
  describe('getProfile', () => {
    it('debería retornar el perfil con relaciones', async () => {
      const profile = createMockProfile();
      profileRepo.findOne.mockResolvedValue(profile);

      const result = await service.getProfile('user-uuid-1');

      expect(result).toEqual(profile);
      expect(profileRepo.findOne).toHaveBeenCalledWith({
        where: { userId: 'user-uuid-1' },
        relations: ['locations', 'contacts', 'businessAreas'],
      });
    });

    it('debería lanzar NotFoundException si no existe', async () => {
      profileRepo.findOne.mockResolvedValue(null);

      await expect(service.getProfile('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // GET PROFILE BY ID
  // ═══════════════════════════════════════════════════════════════════
  describe('getProfileById', () => {
    it('debería retornar el perfil por userId', async () => {
      const profile = createMockProfile();
      profileRepo.findOne.mockResolvedValue(profile);

      const result = await service.getProfileById('user-uuid-1');

      expect(result).toEqual(profile);
    });

    it('debería lanzar NotFoundException si no existe', async () => {
      profileRepo.findOne.mockResolvedValue(null);

      await expect(service.getProfileById('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // UPDATE PROFILE
  // ═══════════════════════════════════════════════════════════════════
  describe('updateProfile', () => {
    it('debería actualizar el perfil y recalcular completeness', async () => {
      const profile = createMockProfile();
      profileRepo.findOne
        .mockResolvedValueOnce(profile) // getProfile
        .mockResolvedValueOnce(profile) // save (completeness)
        .mockResolvedValueOnce({ ...profile, description: 'Nueva descripción' }); // getProfile final
      profileRepo.save.mockResolvedValue({ ...profile, description: 'Nueva descripción' });

      await service.updateProfile('user-uuid-1', { description: 'Nueva descripción' });

      expect(profileRepo.save).toHaveBeenCalled();
      expect(mockEventPublisher.publish).toHaveBeenCalledWith(
        'company.profile.updated',
        expect.objectContaining({ userId: 'user-uuid-1' }),
        'company-service',
      );
    });

    it('debería lanzar NotFoundException si no existe', async () => {
      profileRepo.findOne.mockResolvedValue(null);

      await expect(
        service.updateProfile('non-existent', { description: 'test' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // SEARCH COMPANIES
  // ═══════════════════════════════════════════════════════════════════
  describe('searchCompanies', () => {
    it('debería retornar resultados paginados', async () => {
      const mockQb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[createMockProfile()], 1]),
      };
      profileRepo.createQueryBuilder.mockReturnValue(mockQb);

      const result = await service.searchCompanies({ page: 1, limit: 10 });

      expect(result).toEqual({
        data: expect.any(Array),
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      });
    });

    it('debería filtrar por industry', async () => {
      const mockQb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      };
      profileRepo.createQueryBuilder.mockReturnValue(mockQb);

      await service.searchCompanies({ industry: 'Tecnología', page: 1, limit: 10 });

      expect(mockQb.andWhere).toHaveBeenCalledWith(
        'company.industry = :industry',
        { industry: 'Tecnología' },
      );
    });

    it('debería filtrar por búsqueda de texto', async () => {
      const mockQb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      };
      profileRepo.createQueryBuilder.mockReturnValue(mockQb);

      await service.searchCompanies({ search: 'tech', page: 1, limit: 10 });

      expect(mockQb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('ILIKE'),
        { search: '%tech%' },
      );
    });

    it('debería filtrar por companySize', async () => {
      const mockQb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      };
      profileRepo.createQueryBuilder.mockReturnValue(mockQb);

      await service.searchCompanies({ companySize: CompanySize.SMALL, page: 1, limit: 10 });

      expect(mockQb.andWhere).toHaveBeenCalledWith(
        'company.companySize = :companySize',
        { companySize: CompanySize.SMALL },
      );
    });

    it('debería filtrar por ciudad', async () => {
      const mockQb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      };
      profileRepo.createQueryBuilder.mockReturnValue(mockQb);

      await service.searchCompanies({ city: 'Pasto', page: 1, limit: 10 });

      expect(mockQb.andWhere).toHaveBeenCalledWith(
        'company.headquartersCity ILIKE :city',
        { city: '%Pasto%' },
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // LOCATIONS
  // ═══════════════════════════════════════════════════════════════════
  describe('Locations', () => {
    beforeEach(() => {
      profileRepo.findOne.mockResolvedValue(createMockProfile());
    });

    describe('getLocations', () => {
      it('debería retornar las ubicaciones de la empresa', async () => {
        const locations = [createMockLocation()];
        locationRepo.find.mockResolvedValue(locations);

        const result = await service.getLocations('user-uuid-1');

        expect(result).toEqual(locations);
        expect(locationRepo.find).toHaveBeenCalledWith({
          where: { companyId: 'company-uuid-1' },
          order: { isHeadquarters: 'DESC', createdAt: 'DESC' },
        });
      });
    });

    describe('addLocation', () => {
      it('debería agregar una ubicación', async () => {
        const location = createMockLocation();
        locationRepo.create.mockReturnValue(location);
        locationRepo.save.mockResolvedValue(location);
        profileRepo.findOne.mockResolvedValue(createMockProfile({ locations: [location] }));

        const result = await service.addLocation('user-uuid-1', {
          city: 'Pasto',
          isHeadquarters: true,
        });

        expect(result).toBeDefined();
        expect(locationRepo.create).toHaveBeenCalledWith(
          expect.objectContaining({ city: 'Pasto', companyId: 'company-uuid-1' }),
        );
      });
    });

    describe('updateLocation', () => {
      it('debería actualizar una ubicación', async () => {
        const location = createMockLocation();
        locationRepo.findOne.mockResolvedValue(location);
        locationRepo.save.mockResolvedValue({ ...location, city: 'Bogotá' });

        const result = await service.updateLocation('user-uuid-1', 'location-uuid-1', {
          city: 'Bogotá',
        });

        expect(result.city).toBe('Bogotá');
      });

      it('debería lanzar NotFoundException si no existe', async () => {
        locationRepo.findOne.mockResolvedValue(null);

        await expect(
          service.updateLocation('user-uuid-1', 'non-existent', { city: 'Bogotá' }),
        ).rejects.toThrow(NotFoundException);
      });
    });

    describe('deleteLocation', () => {
      it('debería eliminar una ubicación', async () => {
        const location = createMockLocation();
        locationRepo.findOne.mockResolvedValue(location);
        locationRepo.remove.mockResolvedValue(location);
        profileRepo.findOne.mockResolvedValue(createMockProfile());

        await service.deleteLocation('user-uuid-1', 'location-uuid-1');

        expect(locationRepo.remove).toHaveBeenCalledWith(location);
      });

      it('debería lanzar NotFoundException si no existe', async () => {
        locationRepo.findOne.mockResolvedValue(null);

        await expect(
          service.deleteLocation('user-uuid-1', 'non-existent'),
        ).rejects.toThrow(NotFoundException);
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // CONTACTS
  // ═══════════════════════════════════════════════════════════════════
  describe('Contacts', () => {
    beforeEach(() => {
      profileRepo.findOne.mockResolvedValue(createMockProfile());
    });

    describe('getContacts', () => {
      it('debería retornar los contactos de la empresa', async () => {
        const contacts = [createMockContact()];
        contactRepo.find.mockResolvedValue(contacts);

        const result = await service.getContacts('user-uuid-1');

        expect(result).toEqual(contacts);
        expect(contactRepo.find).toHaveBeenCalledWith({
          where: { companyId: 'company-uuid-1' },
          order: { isPrimary: 'DESC', createdAt: 'DESC' },
        });
      });
    });

    describe('addContact', () => {
      it('debería agregar un contacto', async () => {
        const contact = createMockContact();
        contactRepo.create.mockReturnValue(contact);
        contactRepo.save.mockResolvedValue(contact);
        profileRepo.findOne.mockResolvedValue(createMockProfile({ contacts: [contact] }));

        const result = await service.addContact('user-uuid-1', {
          firstName: 'Carlos',
          lastName: 'Rodríguez',
          email: 'carlos@tech.com',
        });

        expect(result).toBeDefined();
        expect(contactRepo.create).toHaveBeenCalledWith(
          expect.objectContaining({ firstName: 'Carlos', companyId: 'company-uuid-1' }),
        );
      });
    });

    describe('updateContact', () => {
      it('debería actualizar un contacto', async () => {
        const contact = createMockContact();
        contactRepo.findOne.mockResolvedValue(contact);
        contactRepo.save.mockResolvedValue({ ...contact, position: 'CEO' });

        const result = await service.updateContact('user-uuid-1', 'contact-uuid-1', {
          position: 'CEO',
        });

        expect(result.position).toBe('CEO');
      });

      it('debería lanzar NotFoundException si no existe', async () => {
        contactRepo.findOne.mockResolvedValue(null);

        await expect(
          service.updateContact('user-uuid-1', 'non-existent', { position: 'CEO' }),
        ).rejects.toThrow(NotFoundException);
      });
    });

    describe('deleteContact', () => {
      it('debería eliminar un contacto', async () => {
        const contact = createMockContact();
        contactRepo.findOne.mockResolvedValue(contact);
        contactRepo.remove.mockResolvedValue(contact);
        profileRepo.findOne.mockResolvedValue(createMockProfile());

        await service.deleteContact('user-uuid-1', 'contact-uuid-1');

        expect(contactRepo.remove).toHaveBeenCalledWith(contact);
      });

      it('debería lanzar NotFoundException si no existe', async () => {
        contactRepo.findOne.mockResolvedValue(null);

        await expect(
          service.deleteContact('user-uuid-1', 'non-existent'),
        ).rejects.toThrow(NotFoundException);
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // BUSINESS AREAS
  // ═══════════════════════════════════════════════════════════════════
  describe('Business Areas', () => {
    beforeEach(() => {
      profileRepo.findOne.mockResolvedValue(createMockProfile());
    });

    describe('getBusinessAreas', () => {
      it('debería retornar las áreas de negocio', async () => {
        const areas = [createMockArea()];
        areaRepo.find.mockResolvedValue(areas);

        const result = await service.getBusinessAreas('user-uuid-1');

        expect(result).toEqual(areas);
        expect(areaRepo.find).toHaveBeenCalledWith({
          where: { companyId: 'company-uuid-1' },
          order: { displayOrder: 'ASC', createdAt: 'DESC' },
        });
      });
    });

    describe('addBusinessArea', () => {
      it('debería agregar un área de negocio', async () => {
        const area = createMockArea();
        areaRepo.create.mockReturnValue(area);
        areaRepo.save.mockResolvedValue(area);
        profileRepo.findOne.mockResolvedValue(createMockProfile({ businessAreas: [area] }));

        const result = await service.addBusinessArea('user-uuid-1', {
          areaName: 'Desarrollo Web',
        });

        expect(result).toBeDefined();
        expect(areaRepo.create).toHaveBeenCalledWith(
          expect.objectContaining({ areaName: 'Desarrollo Web', companyId: 'company-uuid-1' }),
        );
      });
    });

    describe('deleteBusinessArea', () => {
      it('debería eliminar un área de negocio', async () => {
        const area = createMockArea();
        areaRepo.findOne.mockResolvedValue(area);
        areaRepo.remove.mockResolvedValue(area);
        profileRepo.findOne.mockResolvedValue(createMockProfile());

        await service.deleteBusinessArea('user-uuid-1', 'area-uuid-1');

        expect(areaRepo.remove).toHaveBeenCalledWith(area);
      });

      it('debería lanzar NotFoundException si no existe', async () => {
        areaRepo.findOne.mockResolvedValue(null);

        await expect(
          service.deleteBusinessArea('user-uuid-1', 'non-existent'),
        ).rejects.toThrow(NotFoundException);
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // INTER-SERVICE
  // ═══════════════════════════════════════════════════════════════════
  describe('Inter-service', () => {
    describe('getBasicInfo', () => {
      it('debería retornar datos básicos de la empresa', async () => {
        const profile = createMockProfile({
          locations: [createMockLocation()],
          businessAreas: [createMockArea()],
        });
        profileRepo.findOne.mockResolvedValue(profile);

        const result = await service.getBasicInfo('user-uuid-1');

        expect(result).toEqual(
          expect.objectContaining({
            companyId: 'company-uuid-1',
            companyName: 'Tech Solutions SAS',
          }),
        );
        expect(result.locations).toHaveLength(1);
        expect(result.businessAreas).toHaveLength(1);
      });

      it('debería lanzar NotFoundException si no existe', async () => {
        profileRepo.findOne.mockResolvedValue(null);

        await expect(service.getBasicInfo('non-existent')).rejects.toThrow(NotFoundException);
      });
    });

    describe('exists', () => {
      it('debería retornar true si existe', async () => {
        profileRepo.findOne.mockResolvedValue(createMockProfile());

        const result = await service.exists('user-uuid-1');

        expect(result).toBe(true);
      });

      it('debería retornar false si no existe', async () => {
        profileRepo.findOne.mockResolvedValue(null);

        const result = await service.exists('non-existent');

        expect(result).toBe(false);
      });
    });

    describe('updateVerificationStatus', () => {
      it('debería actualizar el estado de verificación', async () => {
        const profile = createMockProfile();
        profileRepo.findOne.mockResolvedValue(profile);
        profileRepo.save.mockResolvedValue({ ...profile, verificationStatus: VerificationStatus.VERIFIED });

        await service.updateVerificationStatus('user-uuid-1', VerificationStatus.VERIFIED);

        expect(profileRepo.save).toHaveBeenCalledWith(
          expect.objectContaining({ verificationStatus: VerificationStatus.VERIFIED }),
        );
        expect(mockEventPublisher.publish).toHaveBeenCalledWith(
          'company.verification.updated',
          expect.objectContaining({ verificationStatus: VerificationStatus.VERIFIED }),
          'company-service',
        );
      });

      it('debería lanzar NotFoundException si no existe', async () => {
        profileRepo.findOne.mockResolvedValue(null);

        await expect(
          service.updateVerificationStatus('non-existent', VerificationStatus.VERIFIED),
        ).rejects.toThrow(NotFoundException);
      });
    });

    describe('updateRating', () => {
      it('debería actualizar el rating', async () => {
        const profile = createMockProfile();
        profileRepo.findOne.mockResolvedValue(profile);
        profileRepo.save.mockResolvedValue({ ...profile, rating: 4.5, totalReviews: 10 });

        await service.updateRating('user-uuid-1', 4.5, 10);

        expect(profileRepo.save).toHaveBeenCalledWith(
          expect.objectContaining({ rating: 4.5, totalReviews: 10 }),
        );
      });

      it('debería lanzar NotFoundException si no existe', async () => {
        profileRepo.findOne.mockResolvedValue(null);

        await expect(
          service.updateRating('non-existent', 4.5, 10),
        ).rejects.toThrow(NotFoundException);
      });
    });
  });
});

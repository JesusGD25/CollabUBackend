import { Test, TestingModule } from '@nestjs/testing';
import { CompanyController } from './company.controller';
import { CompanyService } from './company.service';
import { JwtAuthGuard, RolesGuard } from '@collab-u/shared';
import { CompanySize, VerificationStatus } from './entities/company-profile.entity';

// ─── Mock del servicio ──────────────────────────────────────────────

const mockCompanyService = {
  createProfile: jest.fn(),
  getProfile: jest.fn(),
  getProfileById: jest.fn(),
  updateProfile: jest.fn(),
  searchCompanies: jest.fn(),
  getLocations: jest.fn(),
  addLocation: jest.fn(),
  updateLocation: jest.fn(),
  deleteLocation: jest.fn(),
  getContacts: jest.fn(),
  addContact: jest.fn(),
  updateContact: jest.fn(),
  deleteContact: jest.fn(),
  getBusinessAreas: jest.fn(),
  addBusinessArea: jest.fn(),
  deleteBusinessArea: jest.fn(),
};

const mockUser = { userId: 'user-uuid-1', email: 'test@test.com', role: 'company' };

// ─── Test Suite ─────────────────────────────────────────────────────

describe('CompanyController', () => {
  let controller: CompanyController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CompanyController],
      providers: [
        { provide: CompanyService, useValue: mockCompanyService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<CompanyController>(CompanyController);
  });

  afterEach(() => jest.clearAllMocks());

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // ═══════════════════════════════════════════════════════════════════
  // PROFILE ENDPOINTS
  // ═══════════════════════════════════════════════════════════════════
  describe('Profile', () => {
    describe('POST /profile', () => {
      it('debería crear un perfil de empresa', async () => {
        const dto = { userId: undefined, companyName: 'Tech Solutions SAS' } as any;
        const expected = { id: 'company-uuid-1', companyName: 'Tech Solutions SAS' };
        mockCompanyService.createProfile.mockResolvedValue(expected);

        const result = await controller.createProfile(mockUser, dto);

        expect(dto.userId).toBe('user-uuid-1');
        expect(result).toEqual(expected);
        expect(mockCompanyService.createProfile).toHaveBeenCalledWith(dto);
      });
    });

    describe('GET /profile', () => {
      it('debería obtener el perfil propio', async () => {
        const expected = { id: 'company-uuid-1', companyName: 'Tech Solutions SAS' };
        mockCompanyService.getProfile.mockResolvedValue(expected);

        const result = await controller.getMyProfile(mockUser);

        expect(result).toEqual(expected);
        expect(mockCompanyService.getProfile).toHaveBeenCalledWith('user-uuid-1');
      });
    });

    describe('GET /profile/:userId', () => {
      it('debería obtener un perfil por userId', async () => {
        const expected = { id: 'company-uuid-1', companyName: 'Tech Solutions SAS' };
        mockCompanyService.getProfileById.mockResolvedValue(expected);

        const result = await controller.getProfileByUserId('other-user-uuid');

        expect(result).toEqual(expected);
        expect(mockCompanyService.getProfileById).toHaveBeenCalledWith('other-user-uuid');
      });
    });

    describe('PATCH /profile', () => {
      it('debería actualizar el perfil propio', async () => {
        const dto = { description: 'Nueva descripción' };
        const expected = { id: 'company-uuid-1', description: 'Nueva descripción' };
        mockCompanyService.updateProfile.mockResolvedValue(expected);

        const result = await controller.updateProfile(mockUser, dto);

        expect(result).toEqual(expected);
        expect(mockCompanyService.updateProfile).toHaveBeenCalledWith('user-uuid-1', dto);
      });
    });

    describe('GET /search', () => {
      it('debería buscar empresas', async () => {
        const query = { page: 1, limit: 10 };
        const expected = { data: [], total: 0, page: 1, limit: 10, totalPages: 0 };
        mockCompanyService.searchCompanies.mockResolvedValue(expected);

        const result = await controller.searchCompanies(query as any);

        expect(result).toEqual(expected);
        expect(mockCompanyService.searchCompanies).toHaveBeenCalledWith(query);
      });

      it('debería buscar con filtros', async () => {
        const query = { industry: 'Tecnología', companySize: CompanySize.SMALL, page: 1, limit: 10 };
        const expected = { data: [], total: 0, page: 1, limit: 10, totalPages: 0 };
        mockCompanyService.searchCompanies.mockResolvedValue(expected);

        const result = await controller.searchCompanies(query as any);

        expect(result).toEqual(expected);
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // LOCATION ENDPOINTS
  // ═══════════════════════════════════════════════════════════════════
  describe('Locations', () => {
    describe('GET /locations', () => {
      it('debería obtener ubicaciones', async () => {
        const expected = [{ id: 'loc-1', city: 'Pasto' }];
        mockCompanyService.getLocations.mockResolvedValue(expected);

        const result = await controller.getLocations(mockUser);

        expect(result).toEqual(expected);
        expect(mockCompanyService.getLocations).toHaveBeenCalledWith('user-uuid-1');
      });
    });

    describe('POST /locations', () => {
      it('debería agregar una ubicación', async () => {
        const dto = { city: 'Pasto', isHeadquarters: true };
        const expected = { id: 'loc-1', ...dto };
        mockCompanyService.addLocation.mockResolvedValue(expected);

        const result = await controller.addLocation(mockUser, dto);

        expect(result).toEqual(expected);
        expect(mockCompanyService.addLocation).toHaveBeenCalledWith('user-uuid-1', dto);
      });
    });

    describe('PATCH /locations/:locationId', () => {
      it('debería actualizar una ubicación', async () => {
        const dto = { city: 'Bogotá' };
        const expected = { id: 'loc-1', city: 'Bogotá' };
        mockCompanyService.updateLocation.mockResolvedValue(expected);

        const result = await controller.updateLocation(mockUser, 'loc-1', dto);

        expect(result).toEqual(expected);
        expect(mockCompanyService.updateLocation).toHaveBeenCalledWith('user-uuid-1', 'loc-1', dto);
      });
    });

    describe('DELETE /locations/:locationId', () => {
      it('debería eliminar una ubicación', async () => {
        mockCompanyService.deleteLocation.mockResolvedValue(undefined);

        await controller.deleteLocation(mockUser, 'loc-1');

        expect(mockCompanyService.deleteLocation).toHaveBeenCalledWith('user-uuid-1', 'loc-1');
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // CONTACT ENDPOINTS
  // ═══════════════════════════════════════════════════════════════════
  describe('Contacts', () => {
    describe('GET /contacts', () => {
      it('debería obtener contactos', async () => {
        const expected = [{ id: 'contact-1', firstName: 'Carlos' }];
        mockCompanyService.getContacts.mockResolvedValue(expected);

        const result = await controller.getContacts(mockUser);

        expect(result).toEqual(expected);
      });
    });

    describe('POST /contacts', () => {
      it('debería agregar un contacto', async () => {
        const dto = { firstName: 'Carlos', lastName: 'Rodríguez', email: 'carlos@tech.com' };
        const expected = { id: 'contact-1', ...dto };
        mockCompanyService.addContact.mockResolvedValue(expected);

        const result = await controller.addContact(mockUser, dto);

        expect(result).toEqual(expected);
        expect(mockCompanyService.addContact).toHaveBeenCalledWith('user-uuid-1', dto);
      });
    });

    describe('PATCH /contacts/:contactId', () => {
      it('debería actualizar un contacto', async () => {
        const dto = { position: 'CEO' };
        const expected = { id: 'contact-1', position: 'CEO' };
        mockCompanyService.updateContact.mockResolvedValue(expected);

        const result = await controller.updateContact(mockUser, 'contact-1', dto);

        expect(result).toEqual(expected);
      });
    });

    describe('DELETE /contacts/:contactId', () => {
      it('debería eliminar un contacto', async () => {
        mockCompanyService.deleteContact.mockResolvedValue(undefined);

        await controller.deleteContact(mockUser, 'contact-1');

        expect(mockCompanyService.deleteContact).toHaveBeenCalledWith('user-uuid-1', 'contact-1');
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // BUSINESS AREA ENDPOINTS
  // ═══════════════════════════════════════════════════════════════════
  describe('Business Areas', () => {
    describe('GET /business-areas', () => {
      it('debería obtener áreas de negocio', async () => {
        const expected = [{ id: 'area-1', areaName: 'Desarrollo Web' }];
        mockCompanyService.getBusinessAreas.mockResolvedValue(expected);

        const result = await controller.getBusinessAreas(mockUser);

        expect(result).toEqual(expected);
      });
    });

    describe('POST /business-areas', () => {
      it('debería agregar un área de negocio', async () => {
        const dto = { areaName: 'Desarrollo Web' };
        const expected = { id: 'area-1', ...dto };
        mockCompanyService.addBusinessArea.mockResolvedValue(expected);

        const result = await controller.addBusinessArea(mockUser, dto);

        expect(result).toEqual(expected);
        expect(mockCompanyService.addBusinessArea).toHaveBeenCalledWith('user-uuid-1', dto);
      });
    });

    describe('DELETE /business-areas/:areaId', () => {
      it('debería eliminar un área de negocio', async () => {
        mockCompanyService.deleteBusinessArea.mockResolvedValue(undefined);

        await controller.deleteBusinessArea(mockUser, 'area-1');

        expect(mockCompanyService.deleteBusinessArea).toHaveBeenCalledWith('user-uuid-1', 'area-1');
      });
    });
  });
});

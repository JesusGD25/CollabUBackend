import { Controller, Get, Post, Param, Query, Body } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { ResolveSkillsByNamesDto } from './dto';

/** Rutas de uso interno entre microservicios — sin autenticación JWT */
@ApiExcludeController()
@Controller('internal/admin')
export class AdminInternalController {
  constructor(private readonly adminService: AdminService) {}

  @Get('document-requirements')
  getDocumentRequirements(
    @Query('actorType') actorType?: string,
    @Query('requiredAtStage') requiredAtStage?: string,
    @Query('projectType') projectType?: string,
  ) {
    return this.adminService.getDocumentRequirements({
      actorType,
      requiredAtStage,
      projectType,
      onlyActive: true,
    });
  }

  @Get('document-requirements/:id')
  getDocumentRequirementById(@Param('id') id: string) {
    return this.adminService.getDocumentRequirementById(id);
  }

  @Get('settings/:key')
  async getSettingByKey(@Param('key') key: string) {
    try {
      return await this.adminService.getSettingByKey(key);
    } catch {
      return null;
    }
  }

  @Get('assignments/stats')
  getAssignmentStats() {
    return this.adminService.getAssignmentStats();
  }

  @Get('assignments/by-application/:applicationId')
  getAssignmentsByApplication(@Param('applicationId') applicationId: string) {
    return this.adminService.getAssignmentsByApplication(applicationId);
  }

  @Get('skills')
  getInternalSkillCatalog() {
    return this.adminService.getInternalSkillCatalog();
  }

  @Get('programs/by-ids')
  getProgramsByIds(@Query('ids') ids?: string) {
    const idList = ids ? ids.split(',').filter(Boolean) : [];
    return this.adminService.getProgramsByIds(idList);
  }

  /** Catálogo completo de programas activos — usado por student-service (backfill/onboarding) para resolver programId por nombre. */
  @Get('programs')
  getInternalPrograms() {
    return this.adminService.getPrograms(true);
  }

  @Post('skills/by-names')
  resolveSkillsByNames(@Body() dto: ResolveSkillsByNamesDto) {
    return this.adminService.resolveSkillsByNames(dto.names);
  }
}

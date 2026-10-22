import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { AdminLevel, UserRole } from '../constants/roles.enum';

/** Lo mínimo que necesita saber el alcance sobre quien hace la petición. */
export interface ScopedUser {
  role?: string | null;
  adminLevel?: string | null;
  departmentId?: string | null;
}

/**
 * Alcance de datos de un administrador:
 *  - `{ all: true }`            → superadmin (Facultad): sin filtro.
 *  - `{ all: false, departmentId }` → admin de departamento: solo su programa académico.
 *  - `null`                     → el usuario NO es admin: el servicio aplica sus reglas por rol de siempre.
 */
export type DepartmentScope = { all: true } | { all: false; departmentId: string };

/** Un `admin` sin nivel explícito (datos previos a la división) cuenta como superadmin. */
export function isSuperAdmin(user: ScopedUser | null | undefined): boolean {
  return user?.role === UserRole.ADMIN && (user.adminLevel ?? AdminLevel.SUPER) === AdminLevel.SUPER;
}

export function isDepartmentAdmin(user: ScopedUser | null | undefined): boolean {
  return user?.role === UserRole.ADMIN && user.adminLevel === AdminLevel.DEPARTMENT;
}

/**
 * Resuelve el alcance. Un admin de departamento SIN `departmentId` es un dato corrupto:
 * se rechaza (403) en vez de interpretarlo como "sin filtro", que filtraría datos de otros departamentos.
 */
export function resolveDepartmentScope(user: ScopedUser | null | undefined): DepartmentScope | null {
  if (!user || user.role !== UserRole.ADMIN) return null;
  if (isSuperAdmin(user)) return { all: true };
  if (!user.departmentId) {
    throw new ForbiddenException('Tu cuenta de administrador de departamento no tiene un departamento asignado.');
  }
  return { all: false, departmentId: user.departmentId };
}

/** Solo el administrador de Facultad (superadmin). */
export function assertSuperAdmin(user: ScopedUser | null | undefined): void {
  if (!isSuperAdmin(user)) {
    throw new ForbiddenException('Esta acción solo está disponible para el administrador de Facultad.');
  }
}

/**
 * ¿El recurso (que pertenece a uno o varios departamentos) cae dentro del alcance?
 *  - sin alcance (`null`) o superadmin → siempre.
 *  - admin de departamento → solo si alguno de los departamentos del recurso es el suyo.
 *    Un recurso SIN departamento solo lo ve el superadmin.
 */
export function scopeAllows(
  scope: DepartmentScope | null,
  resourceDepartments: string | null | undefined | Array<string | null | undefined>,
): boolean {
  if (!scope || scope.all) return true;
  const list = Array.isArray(resourceDepartments) ? resourceDepartments : [resourceDepartments];
  return list.some((d) => !!d && d === scope.departmentId);
}

/** Como `scopeAllows`, pero lanza 404 (no revela que el recurso existe en otro departamento). */
export function assertInScope(
  scope: DepartmentScope | null,
  resourceDepartments: string | null | undefined | Array<string | null | undefined>,
  notFoundMessage = 'Recurso no encontrado',
): void {
  if (!scopeAllows(scope, resourceDepartments)) {
    throw new NotFoundException(notFoundMessage);
  }
}

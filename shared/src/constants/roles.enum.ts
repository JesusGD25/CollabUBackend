export enum UserRole {
  STUDENT = 'student',
  COMPANY = 'company',
  ADMIN = 'admin',
  FACULTY = 'faculty',
}

export const ALL_ROLES = Object.values(UserRole);

/**
 * Nivel de un usuario con `role = admin`.
 *  - `super`: la Facultad — ve y administra todos los departamentos.
 *  - `department`: administrador de UN departamento (programa académico) — solo ve y opera
 *    lo que pertenece a su `departmentId`.
 * Un `admin` sin nivel explícito (datos anteriores a esta división) se trata como `super`.
 */
export enum AdminLevel {
  SUPER = 'super',
  DEPARTMENT = 'department',
}

/** Cabeceras que el API Gateway inyecta tras validar el token. */
export const USER_HEADERS = {
  id: 'x-user-id',
  email: 'x-user-email',
  role: 'x-user-role',
  adminLevel: 'x-user-admin-level',
  departmentId: 'x-user-department-id',
} as const;

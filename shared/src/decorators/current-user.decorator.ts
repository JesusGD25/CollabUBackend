import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface CurrentUserData {
  id: string;
  userId: string;
  email: string;
  role: string;
  /** Solo para `role = admin`: 'super' | 'department'. */
  adminLevel?: string | null;
  /** Solo para admin de departamento: UUID del programa académico que administra. */
  departmentId?: string | null;
}

export const CurrentUser = createParamDecorator(
  (data: keyof CurrentUserData | undefined, ctx: ExecutionContext): CurrentUserData | string => {
    const request = ctx.switchToHttp().getRequest();
    const resolvedUserId = request.headers['x-user-id'] || request.user?.id;

    const user: CurrentUserData = {
      id: resolvedUserId,
      userId: resolvedUserId,
      email: request.headers['x-user-email'] || request.user?.email,
      role: request.headers['x-user-role'] || request.user?.role,
      adminLevel: request.headers['x-user-admin-level'] || request.user?.adminLevel || null,
      departmentId: request.headers['x-user-department-id'] || request.user?.departmentId || null,
    };

    return data ? (user[data] as string) : user;
  },
);

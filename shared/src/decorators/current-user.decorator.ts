import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface CurrentUserData {
  id: string;
  userId: string;
  email: string;
  role: string;
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
    };

    return data ? user[data] : user;
  },
);

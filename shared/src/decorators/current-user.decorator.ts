import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface CurrentUserData {
  id: string;
  email: string;
  role: string;
}

export const CurrentUser = createParamDecorator(
  (data: keyof CurrentUserData | undefined, ctx: ExecutionContext): CurrentUserData | string => {
    const request = ctx.switchToHttp().getRequest();
    const user: CurrentUserData = {
      id: request.headers['x-user-id'] || request.user?.id,
      email: request.headers['x-user-email'] || request.user?.email,
      role: request.headers['x-user-role'] || request.user?.role,
    };

    return data ? user[data] : user;
  },
);

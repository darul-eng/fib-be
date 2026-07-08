import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export type AuthUser = { id: string; role: string };

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser => {
    return ctx.switchToHttp().getRequest().user;
  },
);

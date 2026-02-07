import { createParamDecorator, ExecutionContext } from "@nestjs/common";

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: string;
}

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): AuthenticatedUser => {
    const request = ctx.switchToHttp().getRequest();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return request.user;
  },
);

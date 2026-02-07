import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ROLES_KEY, AuthenticatedUser } from "@/common/decorators";

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
    const request = context.switchToHttp().getRequest() as {
      user: AuthenticatedUser | undefined;
    };
    const user = request.user;

    if (!user) {
      throw new ForbiddenException("User not authenticated");
    }

    if (!requiredRoles.includes(user.role)) {
      throw new ForbiddenException(
        `User role '${user.role}' does not have permission to access this resource`,
      );
    }

    return true;
  }
}

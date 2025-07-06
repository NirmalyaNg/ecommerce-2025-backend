import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '../schema/user.schema';
import { ROLES_KEY } from '../decorator/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    // If there are not specific roles for the handler or controller class
    if (!requiredRoles || !requiredRoles?.length) {
      return true;
    }
    const { user } = context.switchToHttp().getRequest();
    // If there is no user in request object
    if (!user) {
      throw new UnauthorizedException('User not authenticated');
    }
    const hasRequiredRoles = requiredRoles.some((role) => user?.role === role);
    if (!hasRequiredRoles) {
      throw new ForbiddenException('Operation not allowed');
    }
    return true;
  }
}

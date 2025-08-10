import { ExecutionContext, Injectable } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";

@Injectable()
export class OptionalAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext): boolean | Promise<boolean> {
    return super.canActivate(context) as boolean | Promise<boolean>;
  }

  handleRequest(err: any, user: any, info: any) {
    if (!user || err) {
      return null;
    }
    return user;
  }
}
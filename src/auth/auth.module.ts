import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from './schema/user.schema';
import { JwtModule } from '@nestjs/jwt';
import { JwtAuthStrategy } from './strategy/jwt-auth.strategy';
import { RolesGuard } from './guard/role.guard';

@Module({
  imports: [MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]), JwtModule.register({})],
  controllers: [AuthController],
  providers: [AuthService, JwtAuthStrategy, RolesGuard],
})
export class AuthModule {}

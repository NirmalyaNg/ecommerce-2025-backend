import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import {
  AuthService,
  LoginResponse,
  RegisterResponse,
  SafeUser,
} from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from './decorator/roles.decorator';
import { User, UserDocument, UserRole } from './schema/user.schema';
import { RolesGuard } from './guard/role.guard';
import { CurrentUser } from './decorator/current-user.decorator';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  register(@Body() registerDto: RegisterDto): Promise<RegisterResponse> {
    return this.authService.register(registerDto);
  }

  @Post('registerAdmin')
  @Roles(UserRole.ADMIN)
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  registerAdmin(@Body() registerDto: RegisterDto): Promise<RegisterResponse> {
    return this.authService.registerAdmin(registerDto);
  }

  @Post('login')
  login(@Body() loginDto: LoginDto): Promise<LoginResponse> {
    return this.authService.login(loginDto);
  }

  @Get('profile')
  @UseGuards(AuthGuard('jwt'))
  getProfile(@CurrentUser() user: SafeUser): SafeUser {
    return user;
  }
}

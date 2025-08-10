import { Body, Controller, Get, Post, Req, Res, UnauthorizedException, UseGuards } from '@nestjs/common';
import { AuthService, LoginResponse, RegisterResponse, SafeUser } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from './decorator/roles.decorator';
import { UserRole } from './schema/user.schema';
import { RolesGuard } from './guard/role.guard';
import { CurrentUser } from './decorator/current-user.decorator';
import { CookieOptions, Request, Response } from 'express';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  register(@Body() registerDto: RegisterDto): Promise<RegisterResponse> {
    return this.authService.register(registerDto);
  }

  @Post('refresh')
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<{ accessToken: string }> {
    const refreshToken = req.cookies['refreshToken'];
    // Check if refreshToken is present in cookies
    if (!refreshToken) {
      res.clearCookie('refreshToken', { path: '/api/auth/refresh' });
      throw new UnauthorizedException('Invalid refresh token');
    }
    // Get new accessToken and refreshToken
    const tokens = await this.authService.refresh(refreshToken);
    const { httpOnly, maxAge, path, sameSite, secure } = this.getCookieOptions();
    res.cookie('refreshToken', refreshToken, {
      httpOnly,
      maxAge,
      path,
      sameSite,
      secure,
    });
    return {
      accessToken: tokens.accessToken,
    };
  }

  @Post('registerAdmin')
  @Roles(UserRole.ADMIN)
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  registerAdmin(@Body() registerDto: RegisterDto): Promise<RegisterResponse> {
    return this.authService.registerAdmin(registerDto);
  }

  @Post('login')
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<Omit<LoginResponse, 'refreshToken'>> {
    const { refreshToken, ...loginResponseWithoutRefreshToken } = await this.authService.login(loginDto);
    const { httpOnly, maxAge, path, sameSite, secure } = this.getCookieOptions();
    res.cookie('refreshToken', refreshToken, {
      httpOnly,
      maxAge,
      path,
      sameSite,
      secure,
    });
    return loginResponseWithoutRefreshToken;
  }

  @Get('profile')
  @UseGuards(AuthGuard('jwt'))
  getProfile(@CurrentUser() user: SafeUser): SafeUser {
    return user;
  }

  private getCookieOptions(): CookieOptions {
    return {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // only allow cookie to be sent over https in production
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax', // don't allow cookie to be sent with cors in producttion
      path: '/api/auth/refresh', // only allow cookie to be sent when sending request to /api/auth/refresh
      maxAge: 7 * 24 * 60 * 60 * 1000, // age of 7 days
    };
  }
}

import { BadRequestException, ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { Model } from 'mongoose';
import { User, UserDocument, UserRole } from './schema/user.schema';
import { InjectModel } from '@nestjs/mongoose';
import { JwtService } from '@nestjs/jwt';
import { RegisterDto } from './dto/register.dto';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './dto/login.dto';
import { ConfigService } from '@nestjs/config';

export type SafeUser = Pick<UserDocument, '_id' | 'email' | 'username' | 'role'>;

export type RegisterResponse = {
  message: string;
  user: SafeUser;
};

export type TokensResponse = {
  accessToken: string;
  refreshToken?: string;
};

export type LoginResponse = {
  message: string;
  user: SafeUser;
  accessToken: string;
  refreshToken: string;
};

export type JwtPayload = {
  sub: string;
  role: UserRole;
  email: string;
};

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<User>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  // Register
  async register(registerDto: RegisterDto): Promise<RegisterResponse> {
    // Check if user is already registered
    const existingUser = await this.userModel.findOne({ email: registerDto.email }).exec();
    if (existingUser) {
      throw new ConflictException(`User with email ${registerDto.email} already exists. Please login`);
    }
    // Hash plain text password
    const hashedPassword = await this.hashPassword(registerDto.password);
    // Create new user document
    const newUser = new this.userModel({
      email: registerDto.email,
      password: hashedPassword,
      username: registerDto.username,
      role: UserRole.USER,
    });
    // Save user
    const savedUser = await newUser.save();
    return {
      message: 'Registration successful',
      user: {
        _id: savedUser._id,
        email: savedUser.email,
        username: savedUser.username,
        role: savedUser.role,
      },
    };
  }

  // Register Admin
  async registerAdmin(registerDto: RegisterDto): Promise<RegisterResponse> {
    // Check if user is already registered
    const existingUser = await this.userModel.findOne({ email: registerDto.email }).exec();
    if (existingUser) {
      throw new ConflictException(`Admin with email ${registerDto.email} already exists. Please login`);
    }
    // Hash plain text password
    const hashedPassword = await this.hashPassword(registerDto.password);
    // Create new user document
    const newUser = new this.userModel({
      email: registerDto.email,
      password: hashedPassword,
      username: registerDto.username,
      role: UserRole.ADMIN,
    });
    // Save user
    const savedUser = await newUser.save();
    return {
      message: 'Registration successful',
      user: {
        _id: savedUser._id,
        email: savedUser.email,
        username: savedUser.username,
        role: savedUser.role,
      },
    };
  }

  // Login
  async login(loginDto: LoginDto): Promise<LoginResponse> {
    // Check if user exists
    const existingUser = await this.userModel.findOne({ email: loginDto.email }).exec();
    if (!existingUser) {
      throw new BadRequestException(`Invalid email/password`);
    }
    // Verify password
    const isMatch = await this.verify(loginDto.password, existingUser.password);
    if (!isMatch) {
      throw new BadRequestException('Invalid email/password');
    }
    // Generate tokens
    const tokens = this.generateTokens(existingUser);
    return {
      message: 'Login Successful',
      user: {
        _id: existingUser._id,
        email: existingUser.email,
        username: existingUser.username,
        role: existingUser.role,
      },
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  // Refresh
  async refresh(refreshToken: string): Promise<TokensResponse> {
    try {
      // Verify token
      const payload = await this.jwtService.verifyAsync<JwtPayload>(refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_TOKEN_SECRET'),
      });
      // Check for user
      const user = await this.userModel.findById(payload.sub);
      if (!user) {
        throw new UnauthorizedException('User does not exist');
      }
      const tokens = this.generateTokens(user);
      return tokens;
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
    }
  }

  // Get user by id
  async getUserById(id: string): Promise<SafeUser> {
    const existingUser = await this.userModel.findById(id).exec();
    if (!existingUser) {
      throw new UnauthorizedException('Invalid token');
    }
    return {
      _id: existingUser._id,
      email: existingUser.email,
      role: existingUser.role,
      username: existingUser.username,
    };
  }

  private hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 8);
  }

  private verify(plainPassword: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(plainPassword, hashedPassword);
  }

  private generateTokens(user: UserDocument): {
    accessToken: string;
    refreshToken: string;
  } {
    const tokens = {
      accessToken: this.generateAccessToken(user),
      refreshToken: this.generateRefreshToken(user),
    };
    return tokens;
  }

  private generateAccessToken(user: UserDocument): string {
    const payload = {
      sub: user._id,
      role: user.role,
      email: user.email,
    };
    return this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_ACCESS_TOKEN_SECRET'),
      expiresIn: '1h',
    });
  }

  private generateRefreshToken(user: UserDocument): string {
    const payload = {
      sub: user._id,
      role: user.role,
      email: user.email,
    };
    return this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_REFRESH_TOKEN_SECRET'),
      expiresIn: '7d',
    });
  }
}

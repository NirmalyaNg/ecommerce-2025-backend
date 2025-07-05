import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Model } from 'mongoose';
import { User, UserDocument } from './schema/user.schema';
import { InjectModel } from '@nestjs/mongoose';
import { JwtService } from '@nestjs/jwt';
import { RegisterDto } from './dto/register.dto';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<User>,
    private readonly jwtService: JwtService,
  ) {}

  async register(
    registerDto: RegisterDto,
  ): Promise<{ message: string; user: Omit<User, 'password'> }> {
    // Check for existing user
    const existingUser = await this.userModel
      .findOne({
        email: registerDto.email,
      })
      .exec();
    if (existingUser) {
      throw new ConflictException(
        `User with email: ${registerDto.email} already exists.`,
      );
    }
    // Hash Plain text password
    const hashedPassword = await this.hashPassword(registerDto.password);
    // Create new user
    const newUser = new this.userModel({
      username: registerDto.username,
      email: registerDto.email,
      password: hashedPassword,
      isAdmin: false,
    });
    // Save user
    const { password, ...userData } = await newUser.save();
    return {
      message: 'Registration Successful',
      user: userData,
    };
  }

  async login(loginDto: LoginDto) {
    // Check if user exists
    const existingUser = await this.userModel
      .findOne({ email: loginDto.email })
      .exec();
    if (!existingUser) {
      throw new NotFoundException('User is not registered');
    }
    // Check password
    const isMatch = await this.verify(loginDto.password, existingUser.password);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid Credentials');
    }
    // Generate tokens
  }

  private hashPassword(plainPassword: string): Promise<string> {
    return bcrypt.hash(plainPassword, 8);
  }

  private verify(password: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword);
  }

  private generateTokens(user: User) {
    const tokens = {};
  }

  private generateAccessToken(user: UserDocument) {}

  private generateRefreshToken(user: User) {}
}

import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard, JwtUser } from '@org/auth';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('login')
  async login(@Body() dto: LoginDto) {
    const user = await this.auth.validateUser(dto.email, dto.password);
    return this.auth.login(user);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@Req() req: Request & { user: JwtUser }) {
    return req.user;
  }
}

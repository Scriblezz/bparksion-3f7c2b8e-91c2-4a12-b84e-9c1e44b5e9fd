import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Role } from '@org/data';

export interface JwtPayload {
  sub: number;
  email: string;
  role: Role;
  orgId?: number;
}

export interface JwtUser {
  id: number;
  email: string;
  role: Role;
  orgId?: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: process.env.JWT_SECRET || 'dev_secret_change_me',
    });
  }

  validate(payload: JwtPayload): JwtUser {
    return {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
      orgId: payload.orgId,
    };
  }
}

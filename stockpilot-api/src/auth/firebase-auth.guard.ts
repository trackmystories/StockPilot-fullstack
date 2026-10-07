import {CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException} from '@nestjs/common';
import {Reflector} from '@nestjs/core';
import type {Request} from 'express';
import {FirebaseService} from '../firebase/firebase.service';
import {ALLOW_UNVERIFIED_EMAIL_KEY} from './allow-unverified-email.decorator';
import type {AuthenticatedUser} from './auth-user.type';

export type AuthenticatedRequest = Request & {
  user: AuthenticatedUser;
  token: string;
};

@Injectable()
export class FirebaseAuthGuard implements CanActivate {
  constructor(
    private readonly firebase: FirebaseService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const match = request.headers.authorization?.match(/^Bearer\s+(\S+)$/i);

    if (!match) {
      throw new UnauthorizedException('Invalid authentication token.');
    }

    try {
      request.user = await this.firebase.auth.verifyIdToken(match[1], true);
      request.token = match[1];
    } catch {
      throw new UnauthorizedException('Invalid authentication token.');
    }

    const allowUnverified = this.reflector.getAllAndOverride<boolean>(ALLOW_UNVERIFIED_EMAIL_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!allowUnverified && request.user.email_verified !== true) {
      throw new ForbiddenException({
        statusCode: 403,
        error: 'Forbidden',
        code: 'EMAIL_NOT_VERIFIED',
        message: 'Verify your email address to continue.',
      });
    }

    return true;
  }
}
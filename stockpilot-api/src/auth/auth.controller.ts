import {Body, Controller, Delete, Get, HttpCode, Post, Req, UseGuards} from '@nestjs/common';
import {AllowUnverifiedEmail} from './allow-unverified-email.decorator';
import {AuthService} from './auth.service';
import {SignInDto} from './dto/sign-in.dto';
import {SignUpDto} from './dto/sign-up.dto';
import {RefreshTokenDto} from './dto/refresh-token.dto';
import {FirebaseAuthGuard} from './firebase-auth.guard';
import type {AuthenticatedRequest} from './firebase-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('signup')
  signUp(@Body() dto: SignUpDto) {
    return this.auth.signUp(dto);
  }

  @Post('signin')
  @HttpCode(200)
  signIn(@Body() dto: SignInDto) {
    return this.auth.signIn(dto);
  }

  @Post('refresh')
  @HttpCode(200)
  refresh(@Body() dto: RefreshTokenDto) {
    return this.auth.refresh(dto.refreshToken);
  }

  @Post('verification/resend')
  @HttpCode(200)
  @UseGuards(FirebaseAuthGuard)
  @AllowUnverifiedEmail()
  resendVerification(@Req() request: AuthenticatedRequest) {
    return this.auth.resendVerification(request.user.uid, request.token);
  }

  @Get('me')
  @UseGuards(FirebaseAuthGuard)
  @AllowUnverifiedEmail()
  me(@Req() request: AuthenticatedRequest) {
    return this.auth.getCurrentUser(request.user.uid);
  }

  @Delete('account')
  @UseGuards(FirebaseAuthGuard)
  @AllowUnverifiedEmail()
  deleteAccount(@Req() request: AuthenticatedRequest) {
    return this.auth.deleteAccount(request.user.uid);
  }
}

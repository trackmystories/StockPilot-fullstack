import type {
  AuthRepository,
  AuthResult,
  VerificationEmailResult,
} from '../domain/AuthRepository';
import {authenticatedRequest} from './authenticatedRequest';
import {requestJson} from './http';

export class HttpAuthRepository implements AuthRepository {
  signUp(nickname: string, email: string, password: string): Promise<AuthResult> {
    return requestJson('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({
        displayName: nickname.trim(),
        email: email.trim(),
        password,
      }),
    });
  }

  signIn(email: string, password: string): Promise<AuthResult> {
    return requestJson('/auth/signin', {
      method: 'POST',
      body: JSON.stringify({
        email: email.trim(),
        password,
      }),
    });
  }

  resendVerification(): Promise<VerificationEmailResult> {
    return authenticatedRequest('/auth/verification/resend', {
      method: 'POST',
    });
  }
}

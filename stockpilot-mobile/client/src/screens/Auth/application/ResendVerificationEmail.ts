import type {AuthRepository} from '../domain/AuthRepository';

export class ResendVerificationEmail {
  constructor(private readonly authRepository: AuthRepository) {}

  execute() {
    return this.authRepository.resendVerification();
  }
}
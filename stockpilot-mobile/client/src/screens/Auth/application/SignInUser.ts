import type {AuthRepository} from '../domain/AuthRepository';

export class SignInUser {
  constructor(private readonly authRepository: AuthRepository) {}

  execute(email: string, password: string) {
    return this.authRepository.signIn(email, password);
  }
}

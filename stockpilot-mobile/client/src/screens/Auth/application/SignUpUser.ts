import type {AuthRepository} from '../domain/AuthRepository';

export class SignUpUser {
  constructor(private readonly authRepository: AuthRepository) {}

  execute(nickname: string, email: string, password: string) {
    return this.authRepository.signUp(nickname, email, password);
  }
}

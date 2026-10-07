import type {UserRepository} from '../domain/UserRepository';

export class GetCurrentUser {
  constructor(private readonly userRepository: UserRepository) {}

  execute(token: string) {
    return this.userRepository.getCurrentUser(token);
  }
}

import type {User} from './User';

export interface UserRepository {
  getCurrentUser(token: string): Promise<User>;
}

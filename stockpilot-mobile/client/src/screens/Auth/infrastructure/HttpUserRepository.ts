import type {User} from '../domain/User';
import type {UserRepository} from '../domain/UserRepository';

import {authenticatedRequest} from './authenticatedRequest';

export class HttpUserRepository implements UserRepository {
  async getCurrentUser(_token: string): Promise<User> {
    const data = await authenticatedRequest<{
      user: User;
    }>('/auth/me');

    return data.user;
  }
}
